CREATE TABLE `inventorySnapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeNo` varchar(32) NOT NULL,
	`payload` text NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventorySnapshots_id` PRIMARY KEY(`id`),
	CONSTRAINT `inventorySnapshots_employeeNo_unique` UNIQUE(`employeeNo`)
);
