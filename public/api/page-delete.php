<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, DELETE");
header("Access-Control-Expose-Headers: X-New-Nonce");
header('Content-type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
	http_response_code(200);
	exit();
}

include './credentials.php';
include './auth.php';

$conn = new mysqli($host_name, $user_name, $password, $database);
if ($conn->connect_errno) {
	// die('Error: '. $conn->connect_err); // .mysql_error()
	die("Connection error");
}
$conn->set_charset('utf8mb4');

// Authenticate user
$newNonce = authenticate($conn, $_GET['_user'], $_GET['_nonce']);
if ($newNonce === false) {
	http_response_code(401);
	die('Unauthorized');
}

if (!empty($_GET['id'])) {
	$stmt = $conn->prepare("DELETE FROM page WHERE `id`=?");
	$stmt->bind_param("s", $_GET['id']);
	if (!$stmt->execute()) {
		$stmt->close();
		die('Error');
	}
	$stmt->close();
	header('X-New-Nonce: ' . $newNonce);
	echo json_encode(array());
}
?>