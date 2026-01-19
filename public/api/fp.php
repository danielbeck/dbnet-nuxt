<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, DELETE");
// header('Content-type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
	http_response_code(200);
	exit();
}

// Capture analytics

include './credentials.php';

// CREATE TABLE `analytics` (
//   `user` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
//   `date` bigint(13) UNSIGNED NOT NULL,
//   `type` text COLLATE utf8mb4_unicode_ci,
//   `page` text COLLATE utf8mb4_unicode_ci,
//   `referrer` text COLLATE utf8mb4_unicode_ci
// ) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

// Set up the connection
$conn = new mysqli($host_name, $user_name, $password, $database);
if ($conn->connect_errno) {
	// die('Error' . $conn->connect_error);
	die('Connection error');
}

// This is apparently how PHP handles reading POST data
$data = json_decode(file_get_contents('php://input'), true);
if ($data == NULL) {
	die('No data');
}

// sanitize and convert data:
if ($data['date']) {$data['date'] = intval($data['date']);}

$fields = ['user', 'type', 'page', 'referrer', 'agent', 'date'];
$cols = [];
$vals = [];
$types = '';
$params = [];

foreach ($fields as $field) {
	if (isset($data[$field]) && $data[$field]) {
		$cols[] = "`$field`";
		$vals[] = '?';
		if ($field === 'date') {
			$types .= 'i';
		} else {
			$types .= 's';
		}
		$params[] = &$data[$field];
	}
}

if (empty($params)) {
	die('No data to insert');
}

$sql = "INSERT INTO `analytics` (" . implode(',', $cols) . ") VALUES (" . implode(',', $vals) . ")";
$stmt = $conn->prepare($sql);
array_unshift($params, $types);
call_user_func_array([$stmt, 'bind_param'], $params);

// Actually make the query
if (!$stmt->execute()) {
	$stmt->close();
	die('Error: ' . $conn->error);
}
$stmt->close();

?>