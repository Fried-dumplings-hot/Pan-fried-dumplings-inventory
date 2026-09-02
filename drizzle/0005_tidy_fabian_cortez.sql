CREATE TABLE `formTemplateStores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateId` int NOT NULL,
	`storeId` int NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `formTemplateStores_id` PRIMARY KEY(`id`),
	CONSTRAINT `template_store_unique` UNIQUE(`templateId`,`storeId`)
);
--> statement-breakpoint
CREATE TABLE `materialItemStores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`itemId` int NOT NULL,
	`storeId` int NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `materialItemStores_id` PRIMARY KEY(`id`),
	CONSTRAINT `item_store_unique` UNIQUE(`itemId`,`storeId`)
);
