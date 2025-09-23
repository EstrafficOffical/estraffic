// редиректим с корня на дефолтную локаль
import { redirect } from "next/navigation";

export default function Page() {
  redirect("/ru");
}
