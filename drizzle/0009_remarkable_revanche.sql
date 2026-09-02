CREATE TABLE `brandSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyName` varchar(120) NOT NULL,
	`logoKey` varchar(255),
	`logoUrl` varchar(500),
	`updatedBy` varchar(80),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `brandSettings_id` PRIMARY KEY(`id`)
);
