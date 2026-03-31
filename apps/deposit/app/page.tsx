import { cookies } from "next/headers";
import { getAuthenticatedUserFromCookies } from "@dynamic-demos/dynamic";
import { DepositWidget } from "@/components/deposit-widget";
import { getDepositSessionBootstrapFromJwtPayload } from "@/lib/deposit-session-bootstrap";

export default async function Home() {
  const cookieStore = await cookies();
  const user = await getAuthenticatedUserFromCookies(cookieStore);
  const sessionBootstrap = getDepositSessionBootstrapFromJwtPayload(user);

  return <DepositWidget sessionBootstrap={sessionBootstrap} />;
}
