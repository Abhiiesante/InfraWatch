# Organization Settings Pages

> **IEKB Section:** 05 — Frontend  
> **Document:** 11-org-settings-pages.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Frontend Lead  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [Layout and Navigation](#layout-and-navigation)
3. [User Management Tab](#user-management-tab)
4. [Notification Settings Tab](#notification-settings-tab)
5. [Related Documents](#related-documents)

---

## Overview

The Settings pages are restricted to users with the `ADMIN` role (and partially to `MANAGER`s for non-destructive actions). This area handles tenant-wide configurations, user invitations, and notification preferences.

---

## Layout and Navigation

Since Settings contains multiple distinct sub-sections, we use a Sidebar or vertical Tabs layout rather than cluttering a single long page.

```tsx
// src/features/settings/routes/SettingsLayout.tsx
import { NavLink, Outlet } from 'react-router-dom';
import { useAuthorization } from '@/hooks/useAuthorization';

export const SettingsLayout = () => {
  const { checkAccess } = useAuthorization();

  // If user navigated here directly but isn't an admin
  if (!checkAccess(['ADMIN'])) {
    return <UnauthorizedMessage />;
  }

  return (
    <div className="flex flex-col md:flex-row gap-8">
      <aside className="w-full md:w-64 space-y-2">
        <h2 className="text-xl font-bold mb-4">Settings</h2>
        <nav className="flex flex-col space-y-1">
          <NavLink 
            to="general" 
            className={({ isActive }) => `p-2 rounded-md ${isActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}
          >
            General Configuration
          </NavLink>
          <NavLink 
            to="users" 
            className={({ isActive }) => `p-2 rounded-md ${isActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}
          >
            User Management
          </NavLink>
          <NavLink 
            to="notifications" 
            className={({ isActive }) => `p-2 rounded-md ${isActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}
          >
            Notifications & Integrations
          </NavLink>
        </nav>
      </aside>
      
      <main className="flex-1">
        <Outlet /> {/* Renders the selected sub-page */}
      </main>
    </div>
  );
};
```

---

## User Management Tab

The Users tab lists all users in the tenant and allows the Admin to invite new users or deactivate existing ones.

### Last Admin Protection
The backend prevents deactivating the last active Admin, but the UI should proactively disable the button and show a tooltip to prevent a frustrating API error.

```tsx
// src/features/settings/components/UserActionsMenu.tsx
import { useSettingsStore } from '../store';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

export const UserActionsMenu = ({ targetUser }) => {
  const { currentUser } = useAuthStore();
  
  // Custom hook that checks the cached users list to count admins
  const adminCount = useAdminCount(); 
  
  const isSelf = currentUser?.id === targetUser.id;
  const isLastAdmin = targetUser.role === 'ADMIN' && adminCount <= 1;
  const cannotDeactivate = isSelf || isLastAdmin;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div> {/* Required wrapper because disabled buttons don't trigger hover events */}
          <Button 
            variant="destructive" 
            size="sm"
            disabled={cannotDeactivate}
            onClick={() => handleDeactivate(targetUser.id)}
          >
            Deactivate
          </Button>
        </div>
      </TooltipTrigger>
      {cannotDeactivate && (
        <TooltipContent>
          {isSelf ? "You cannot deactivate yourself." : "You cannot deactivate the last admin."}
        </TooltipContent>
      )}
    </Tooltip>
  );
};
```

---

## Notification Settings Tab

This tab manages the JSONB settings stored on the `Organization` record. It uses a dynamic form to toggle Slack and Email integrations.

```tsx
// src/features/settings/routes/NotificationsTab.tsx
import { useForm, Controller } from 'react-hook-form';
import { useSettings } from '../api/useSettings';
import { useUpdateSettings } from '../api/useUpdateSettings';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';

export const NotificationsTab = () => {
  const { data: settings, isLoading } = useSettings();
  const updateMutation = useUpdateSettings();
  
  const { control, handleSubmit, watch } = useForm({
    defaultValues: settings?.notificationConfig || { email: true, slack: false, slack_webhook_url: '' }
  });

  const slackEnabled = watch('slack');

  const onSubmit = (data) => {
    updateMutation.mutate({ notificationConfig: data });
  };

  if (isLoading) return <Skeleton />;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <h3 className="text-lg font-medium">Incident Alerts</h3>
      
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div>
          <p className="font-medium">Email Notifications</p>
          <p className="text-sm text-muted-foreground">Send high-priority alerts via email</p>
        </div>
        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          )}
        />
      </div>

      <div className="p-4 border rounded-lg space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Slack Integration</p>
            <p className="text-sm text-muted-foreground">Post incident alerts to a Slack channel</p>
          </div>
          <Controller
            name="slack"
            control={control}
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>
        
        {slackEnabled && (
          <div className="pt-4 border-t">
            <label className="text-sm font-medium">Webhook URL</label>
            <Controller
              name="slack_webhook_url"
              control={control}
              render={({ field }) => (
                <Input {...field} placeholder="https://hooks.slack.com/..." className="mt-1" />
              )}
            />
          </div>
        )}
      </div>

      <Button type="submit" disabled={updateMutation.isLoading}>
        Save Preferences
      </Button>
    </form>
  );
};
```

---

## Related Documents

- **API Contracts:** [Org & User Endpoints](../04-api/03-org-user-endpoints.md)
- **Backend Service:** [Organization Service](../03-backend/04-org-service.md)
- **Backend Service:** [Notification Service](../03-backend/11-notification-service.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
