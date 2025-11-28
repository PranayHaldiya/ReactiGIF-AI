"use client";

import { Sparkles, Clock, LogIn } from "lucide-react";
import { UserButton, SignInButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const menuItems = [
  {
    title: "Home",
    url: "/",
    icon: Sparkles,
  },
  {
    title: "History",
    url: "/history",
    icon: Clock,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user, isLoaded } = useUser();

  return (
    <Sidebar variant="floating" collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex h-12 items-center px-2">
          <Image src="/ReactiGIF.svg" alt="ReactiGIF Logo" width={20} height={20} />
          <span className="ml-2 font-semibold group-data-[collapsible=icon]:hidden">
            ReactiGIF
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        {isLoaded && user ? (
          <div className="flex items-center gap-2 px-2 py-2">
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  userButtonAvatarBox: "h-8 w-8",
                },
              }}
            />
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-medium">Account</span>
              <span className="text-xs text-muted-foreground">
                Manage settings
              </span>
            </div>
          </div>
        ) : (
          <div className="px-2 py-2">
            <SignInButton mode="modal">
              <Button className="w-full group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:px-2">
                <LogIn className="h-4 w-4 group-data-[collapsible=icon]:mr-0 mr-2" />
                <span className="group-data-[collapsible=icon]:hidden">Sign In</span>
              </Button>
            </SignInButton>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
