import { Logo } from "@/components/brand";
import { Button } from "@/components/ui";
import { signOut } from "@/app/admin/actions/auth";

export const metadata = { title: "No access" };

export default function NoAccessPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="max-w-sm text-center">
        <Logo className="mx-auto w-32" sizes="128px" />
        <h1 className="mt-10 text-xl font-semibold">No dashboard access</h1>
        <p className="mt-3 text-sm text-grey">Your account is signed in but has not been given access to the iZone dashboard. Ask the owner to add you in Team.</p>
        <form action={signOut} className="mt-8">
          <Button type="submit">Sign out</Button>
        </form>
      </div>
    </div>
  );
}
