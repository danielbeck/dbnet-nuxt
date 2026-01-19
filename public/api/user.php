<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, DELETE");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
	http_response_code(200);
	exit();
}

include './credentials.php';

$conn = new mysqli($host_name, $user_name, $password, $database);
if ($conn->connect_errno) {
	die('Error: ' . $conn->connect_err); // .mysql_error()
}
$conn->set_charset('utf8mb4');

$data = json_decode(file_get_contents('php://input'), true);

$u = $data['u']; // username
$p = $data['p']; // password
$new = $data['new']; // update password
$n = intval($data['n']); // nonce

if (empty($u)) {
	// Headers already sent above
	echo "0";
	exit();
}

// get existing data using prepared statement
$stmt = $conn->prepare("SELECT * from `user` where `user`=?");
$stmt->bind_param("s", $u);
$stmt->execute();
$result = $stmt->get_result();
$data = $result->fetch_assoc();
$stmt->close();

if (!$data) {
	echo "0";
	exit();
}

if ($p) {
	if (!password_verify($p, $data['pwd'])) {
		echo "0";
		exit();
	}
} else if ($n) {
	if ($n != $data['nonce']) {
		echo "0";
		exit();
	}
} else {
	echo "0";
	exit();
}

$nonce = rand(1, 65535);
$pwd = $data['pwd'];
if ($new) {
	$pwd = password_hash($new, PASSWORD_BCRYPT);
}

$stmt = $conn->prepare("UPDATE `user` SET `nonce`=?, `pwd`=? WHERE `user`=?");
$stmt->bind_param("iss", $nonce, $pwd, $u);
if (!$stmt->execute()) {
	$stmt->close();
	die("Error");
}
$stmt->close();

echo $nonce;

?>