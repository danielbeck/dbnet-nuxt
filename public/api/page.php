<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept");
header('Content-type: application/json');

/*

CREATE TABLE `page` (
`id` varchar(13) COLLATE utf8mb4_unicode_ci NOT NULL,
`path` tinytext COLLATE utf8mb4_unicode_ci NOT NULL,
`_created` bigint(13) NOT NULL,
`_edited` bigint(13) NOT NULL,
`tag` tinytext COLLATE utf8mb4_unicode_ci,
`title` tinytext COLLATE utf8mb4_unicode_ci,
`body` text COLLATE utf8mb4_unicode_ci
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

 */

include './credentials.php';

$conn = new mysqli($host_name, $user_name, $password, $database);
if ($conn->connect_errno) {
	die('Error: ' . $conn->connect_err); // .mysql_error()
}
$conn->set_charset('utf8mb4');

if (!empty($_GET['id'])) {
	$stmt = $conn->prepare("SELECT * FROM `page` WHERE `id`=?");
	$stmt->bind_param("s", $_GET['id']);
	$stmt->execute();
	$result = $stmt->get_result();
} else {
	$result = $conn->query("SELECT * FROM `page` ORDER BY `_created` DESC");
}

if (!$result) {
	die('Error: ' . $conn->error);
}

$pages = array();

while ($row = $result->fetch_assoc()) {
	$pages[] = $row;
}

if (isset($stmt)) {
	$stmt->close();
}

echo json_encode($pages)
?>