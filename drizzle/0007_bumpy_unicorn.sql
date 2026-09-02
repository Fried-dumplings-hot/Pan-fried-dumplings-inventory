ALTER TABLE `stores` ADD `storeCode` varchar(5);
--> statement-breakpoint
UPDATE `stores` SET `storeCode` = LPAD(CAST(`id` AS CHAR), 5, '0') WHERE `storeCode` IS NULL;
--> statement-breakpoint
ALTER TABLE `stores` MODIFY `storeCode` varchar(5) NOT NULL;
--> statement-breakpoint
ALTER TABLE `stores` ADD CONSTRAINT `stores_storeCode_unique` UNIQUE(`storeCode`);
