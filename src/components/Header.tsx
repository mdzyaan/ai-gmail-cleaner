import { Button } from "@/components/ui/button";
import { signOut, useSession } from 'next-auth/react';

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="flex h-16 items-center px-4 gap-4">
        <div className="flex-1">
          <h2 className="text-lg font-semibold">Gmail Cleanup</h2>
        </div>
        <div className="flex items-center gap-4">
          {session?.user?.email && (
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-end">
                <p className="text-sm font-medium">{session.user.name}</p>
                <p className="text-xs text-gray-500">{session.user.email}</p>
              </div>
              {session.user.image && (
                <img
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  className="h-8 w-8 rounded-full"
                />
              )}
            </div>
          )}
          <Button
            variant="outline"
            onClick={() => signOut({ callbackUrl: '/' })}
          >
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  );
} 