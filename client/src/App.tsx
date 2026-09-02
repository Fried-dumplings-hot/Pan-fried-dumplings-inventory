import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import { AdminSettingsHome, AuditLogsPage, EmployeeSettingsPage, InventoryTimelinePage, ItemSettingsPage, ItemSummaryPage, LoginBrandSettingsPage, StoreSettingsPage, TemplateSettingsPage } from "./pages/AdminSettingsPages";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/admin/settings"} component={AdminSettingsHome} />
      <Route path={"/admin/login-brand"} component={LoginBrandSettingsPage} />
      <Route path={"/admin/items"} component={ItemSettingsPage} />
      <Route path={"/admin/item-summary"} component={ItemSummaryPage} />
      <Route path={"/admin/employees"} component={EmployeeSettingsPage} />
      <Route path={"/admin/templates"} component={TemplateSettingsPage} />
      <Route path={"/admin/stores"} component={StoreSettingsPage} />
      <Route path={"/admin/audit"} component={AuditLogsPage} />
      <Route path={"/admin/inventory-timeline"} component={InventoryTimelinePage} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster position="bottom-right" closeButton />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
