import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, uniqueIndex } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const brandSettings = mysqlTable("brandSettings", {
  id: int("id").autoincrement().primaryKey(),
  companyName: varchar("companyName", { length: 120 }).notNull(),
  logoKey: varchar("logoKey", { length: 255 }),
  logoUrl: varchar("logoUrl", { length: 500 }),
  updatedBy: varchar("updatedBy", { length: 80 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const employees = mysqlTable("employees", {
  id: int("id").autoincrement().primaryKey(),
  employeeNo: varchar("employeeNo", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 80 }).notNull(),
  role: mysqlEnum("role", ["admin", "staff"]).default("staff").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const stores = mysqlTable("stores", {
  id: int("id").autoincrement().primaryKey(),
  storeCode: varchar("storeCode", { length: 5 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull().unique(),
  address: varchar("address", { length: 240 }).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const employeeStores = mysqlTable("employeeStores", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  storeId: int("storeId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ employeeStoreUnique: uniqueIndex("employee_store_unique").on(table.employeeId, table.storeId) }));

export const materialItems = mysqlTable("materialItems", {
  id: int("id").autoincrement().primaryKey(),
  materialCode: varchar("materialCode", { length: 7 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull().unique(),
  unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }).notNull(),
  largeUnit: varchar("largeUnit", { length: 30 }).notNull(),
  smallUnit: varchar("smallUnit", { length: 30 }).notNull(),
  conversionRatio: int("conversionRatio").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const materialItemStores = mysqlTable("materialItemStores", {
  id: int("id").autoincrement().primaryKey(),
  itemId: int("itemId").notNull(),
  storeId: int("storeId").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({ itemStoreUnique: uniqueIndex("item_store_unique").on(table.itemId, table.storeId) }));

export const rolePermissions = mysqlTable("rolePermissions", {
  id: int("id").autoincrement().primaryKey(),
  role: mysqlEnum("role", ["admin", "staff"]).notNull(),
  module: mysqlEnum("module", ["purchase", "return", "scrap", "count", "inventory", "report", "admin"]).notNull(),
  canCreate: boolean("canCreate").default(false).notNull(),
  canUpdate: boolean("canUpdate").default(false).notNull(),
  canDelete: boolean("canDelete").default(false).notNull(),
}, (table) => ({ roleModuleUnique: uniqueIndex("role_module_unique").on(table.role, table.module) }));

export const formTemplates = mysqlTable("formTemplates", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["purchase", "return", "scrap", "count"]).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  itemIds: text("itemIds").notNull(),
  active: boolean("active").default(true).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const formTemplateStores = mysqlTable("formTemplateStores", {
  id: int("id").autoincrement().primaryKey(),
  templateId: int("templateId").notNull(),
  storeId: int("storeId").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({ templateStoreUnique: uniqueIndex("template_store_unique").on(table.templateId, table.storeId) }));

export const inventoryDocuments = mysqlTable("inventoryDocuments", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["purchase", "return", "scrap", "count"]).notNull(),
  documentDate: varchar("documentDate", { length: 10 }).notNull(),
  employeeId: int("employeeId").notNull(),
  storeId: int("storeId"),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const storeAuditLogs = mysqlTable("storeAuditLogs", {
  id: int("id").autoincrement().primaryKey(),
  operatorOpenId: varchar("operatorOpenId", { length: 64 }).notNull(),
  operatorName: varchar("operatorName", { length: 120 }).notNull(),
  storeId: int("storeId").notNull(),
  storeCode: varchar("storeCode", { length: 5 }).notNull(),
  storeName: varchar("storeName", { length: 120 }).notNull(),
  action: varchar("action", { length: 40 }).notNull(),
  beforeState: text("beforeState"),
  afterState: text("afterState"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const inventorySnapshots = mysqlTable("inventorySnapshots", {
  id: int("id").autoincrement().primaryKey(),
  employeeNo: varchar("employeeNo", { length: 32 }).notNull().unique(),
  payload: text("payload").notNull(),
  snapshotVersion: int("snapshotVersion").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const inventoryDocumentLines = mysqlTable("inventoryDocumentLines", {
  id: int("id").autoincrement().primaryKey(),
  documentId: int("documentId").notNull(),
  itemId: int("itemId").notNull(),
  quantity: decimal("quantity", { precision: 12, scale: 3 }).notNull(),
  unit: varchar("unit", { length: 30 }).notNull(),
  countedQuantity: decimal("countedQuantity", { precision: 12, scale: 3 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BrandSetting = typeof brandSettings.$inferSelect;
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Employee = typeof employees.$inferSelect;
export type Store = typeof stores.$inferSelect;
export type EmployeeStore = typeof employeeStores.$inferSelect;
export type MaterialItem = typeof materialItems.$inferSelect;
export type MaterialItemStore = typeof materialItemStores.$inferSelect;
export type FormTemplateStore = typeof formTemplateStores.$inferSelect;
export type InventoryDocument = typeof inventoryDocuments.$inferSelect;
export type InventoryDocumentLine = typeof inventoryDocumentLines.$inferSelect;
export type StoreAuditLog = typeof storeAuditLogs.$inferSelect;
export type InventorySnapshot = typeof inventorySnapshots.$inferSelect;
