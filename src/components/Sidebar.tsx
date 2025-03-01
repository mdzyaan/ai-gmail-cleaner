import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface SidebarNavProps {
  items: {
    title: string;
    href: string;
    icon: React.ReactNode;
  }[];
}

export function Sidebar({ items }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="grid items-start gap-2">
      {items.map((item, index) => (
        <Link
          key={index}
          href={item.href}
        >
          <span
            className={cn(
              "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-100",
              pathname === item.href ? "bg-gray-100" : "transparent"
            )}
          >
            <span className="mr-2 h-4 w-4">{item.icon}</span>
            <span>{item.title}</span>
          </span>
        </Link>
      ))}
    </nav>
  );
} 