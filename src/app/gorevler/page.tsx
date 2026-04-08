import { AppNav } from "@/components/AppNav";
import { TasksBoard } from "@/components/tasks/TasksBoard";

export const metadata = {
  title: "Görevler ve to-do · DGK",
};

export default function GorevlerPage() {
  return (
    <>
      <AppNav current="gorevler" />
      <main className="mx-auto max-w-[1600px] flex-1 px-4 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
            Görevler ve to-do
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Gündelik görevlerinizi ve açık iş kayıtlarınızı (Evrentek, Vih Soft
            Inc.) tek listede görün. İş sözleşmelerini düzenlemek için İş
            sayfasına gidin.
          </p>
        </div>
        <TasksBoard />
      </main>
    </>
  );
}
