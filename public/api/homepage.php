<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, DELETE");
header('Content-type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
	http_response_code(200);
	exit();
}

include './credentials.php';

$conn = new mysqli($host_name, $user_name, $password, $database);
if ($conn->connect_errno) {
	die('Error: ' . $conn->connect_err); // .mysql_error()
}

// get the pool items necessary for the homepage:

$pool = array();
$tags = ['%photos%', '%blog%', '%geek%'];

foreach ($tags as $tag) {
	$stmt = $conn->prepare("SELECT * FROM `pool` WHERE `tags` LIKE ? ORDER BY `date` DESC LIMIT 10");
	$stmt->bind_param("s", $tag);
	$stmt->execute();
	$result = $stmt->get_result();
	
	while ($row = $result->fetch_assoc()) {
		if ($row['tags']) {
			// tags field in database looks like:  "tag one", "tagtwo", "three"
			$row['tags'] = trim($row['tags'], ' "'); // trim leading and trailing whitespace and quotes
			$row['tags'] = preg_split('/", ?"/', $row['tags']); // split
		} else {
			unset($row['tags']); // skip null values
		}
		$pool[] = $row;
	}
	$stmt->close();
}

echo json_encode($pool)
?>