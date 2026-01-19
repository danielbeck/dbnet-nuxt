<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept");
header('Content-type: application/json');

/*

CREATE TABLE `pool` (
`id` mediumint(8) UNSIGNED auto_increment NOT NULL,
`_created` bigint(20) UNSIGNED NOT NULL,
`_edited` bigint(20) UNSIGNED NOT NULL,
`date` bigint(13) UNSIGNED NOT NULL,
`title` tinytext COLLATE utf8mb4_unicode_ci,
`slug` tinytext COLLATE utf8mb4_unicode_ci,
`body` text COLLATE utf8mb4_unicode_ci,
`tags` text COLLATE utf8mb4_unicode_ci,
`img` tinytext COLLATE utf8mb4_unicode_ci,
`f` tinytext COLLATE utf8mb4_unicode_ci,
`mm` tinytext COLLATE utf8mb4_unicode_ci,
`iso` tinytext COLLATE utf8mb4_unicode_ci,
`shutter` tinytext COLLATE utf8mb4_unicode_ci
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
 */

include './credentials.php';

$conn = new mysqli($host_name, $user_name, $password, $database);
if ($conn->connect_errno) {
	die('Error: ' . $conn->connect_err); // .mysql_error()
}
$conn->set_charset('utf8mb4');

if (!empty($_GET['tag'])) {
	$searchTag = '%"' . $_GET['tag'] . '"%';
	$stmt = $conn->prepare("SELECT * FROM `pool` WHERE `tags` LIKE ? ORDER BY `date` DESC");
	$stmt->bind_param("s", $searchTag);
	$stmt->execute();
	$result = $stmt->get_result();
} else if (!empty($_GET['id'])) {
	$id = intval($_GET['id']);
	$stmt = $conn->prepare("SELECT * FROM `pool` WHERE `id`=?");
	$stmt->bind_param("i", $id);
	$stmt->execute();
	$result = $stmt->get_result();
} else {
	$result = $conn->query("SELECT * FROM `pool` ORDER BY `date` DESC");
}
if (!$result) {
	die('Error: ' . $conn->error);
}

$pool = array();

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

echo json_encode($pool)
?>