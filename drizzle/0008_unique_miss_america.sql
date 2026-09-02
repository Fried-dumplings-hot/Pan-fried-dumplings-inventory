CREATE TABLE `storeAuditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`operatorOpenId` varchar(64) NOT NULL,
	`operatorName` varchar(120) NOT NULL,
	`storeId` int NOT NULL,
	`storeCode` varchar(5) NOT NULL,
	`storeName` varchar(120) NOT NULL,
	`action` varchar(40) NOT NULL,
	`beforeState` text,
	`afterState` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `storeAuditLogs_id` PRIMARY KEY(`id`)
);
