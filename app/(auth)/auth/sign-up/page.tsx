import { RouteStub } from "@/components/route-stub";

export default function Page() {
  return (
    <RouteStub
      title="sign up"
      route="/auth/sign-up"
      roles={["public"]}
      publicSafe={true}
      summary="authentication sign up"
    />
  );
}
