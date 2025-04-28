"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  Calendar, 
  LayoutDashboard, 
  ClipboardList, 
  Settings 
} from "lucide-react";

export default function BottomNavBar() {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Início",
      href: "/dashboard",
      icon: Home,
    },
    {
      label: "Agenda",
      href: "/dashboard/calendar",
      icon: Calendar,
    },
    {
      label: "Projetos",
      href: "/dashboard/projects",
      icon: LayoutDashboard,
    },
    {
      label: "Tarefas",
      href: "/dashboard/tasks",
      icon: ClipboardList,
    },
    {
      label: "Config",
      href: "/dashboard/settings",
      icon: Settings,
    },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        
        return (
          <Link 
            key={item.href} 
            href={item.href}
            className={`bottom-nav-item ${isActive ? "active" : ""}`}
          >
            <div className="bottom-nav-icon">
              <item.icon size={20} />
            </div>
            <span className="bottom-nav-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
} 