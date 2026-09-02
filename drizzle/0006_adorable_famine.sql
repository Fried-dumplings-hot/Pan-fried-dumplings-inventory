ALTER TABLE `materialItems` ADD `materialCode` varchar(7) NOT NULL;--> statement-breakpoint
ALTER TABLE `materialItems` ADD CONSTRAINT `materialItems_materialCode_unique` UNIQUE(`materialCode`);