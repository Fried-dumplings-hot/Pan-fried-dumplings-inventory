CREATE TABLE `employeeStores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`storeId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `employeeStores_id` PRIMARY KEY(`id`),
	CONSTRAINT `employee_store_unique` UNIQUE(`employeeId`,`storeId`)
);
--> statement-breakpoint
CREATE TABLE `stores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`address` varchar(240) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stores_id` PRIMARY KEY(`id`),
	CONSTRAINT `stores_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
ALTER TABLE `inventoryDocuments` ADD `storeId` int;