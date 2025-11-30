import { redirect } from "next/navigation";

const AdminIndexPage = (): void => {
  redirect("/admin/songs");
};

export default AdminIndexPage;
