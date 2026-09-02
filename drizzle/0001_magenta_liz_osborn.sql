CREATE TABLE `employees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeNo` varchar(32) NOT NULL,
	`name` varchar(80) NOT NULL,
	`role` enum('admin','staff') NOT NULL DEFAULT 'staff',
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employees_id` PRIMARY KEY(`id`),
	CONSTRAINT `employees_employeeNo_unique` UNIQUE(`employeeNo`)
);
--> statement-breakpoint
CREATE TABLE `formTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('purchase','return','scrap','count') NOT NULL,
	`name` varchar(120) NOT NULL,
	`itemIds` text NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `formTemplates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventoryDocumentLines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` int NOT NULL,
	`itemId` int NOT NULL,
	`quantity` decimal(12,3) NOT NULL,
	`unit` varchar(30) NOT NULL,
	`countedQuantity` decimal(12,3),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inventoryDocumentLines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventoryDocuments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('purchase','return','scrap','count') NOT NULL,
	`documentDate` varchar(10) NOT NULL,
	`employeeId` int NOT NULL,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventoryDocuments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `materialItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`unitPrice` decimal(12,2) NOT NULL,
	`largeUnit` varchar(30) NOT NULL,
	`smallUnit` varchar(30) NOT NULL,
	`conversionRatio` int NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `materialItems_id` PRIMARY KEY(`id`),
	CONSTRAINT `materialItems_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `rolePermissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`role` enum('admin','staff') NOT NULL,
	`module` enum('purchase','return','scrap','count','inventory','report','admin') NOT NULL,
	`canCreate` boolean NOT NULL DEFAULT false,
	`canUpdate` boolean NOT NULL DEFAULT false,
	`canDelete` boolean NOT NULL DEFAULT false,
	CONSTRAINT `rolePermissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `role_module_unique` UNIQUE(`role`,`module`)
);
