"use client";

import { useMemo, useState } from "react";
import { useApp } from "./AppProvider";
import { Project, Task, TaskStatus } from "@/lib/types";
import { ROLE_POLICIES } from "@/lib/rbac";
import { formatDate } from "@/lib/format";

const STATUSES: TaskStatus[] = ["Todo", "In Progress", "Done", "Blocked"];

const STATUS_STYLES: Record<TaskStatus, string> = {
  Todo: "bg-slate-100 text-slate-600 border-slate-200",
  "In Progress": "bg-blue-100 text-blue-700 border-blue-200",
  Done: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Blocked: "bg-rose-100 text-rose-700 border-rose-200",
};

const PRIORITY_STYLES = {
  Low: "text-slate-500",
  Medium: "text-amber-600",
  High: "text-rose-600",
} as const;

interface FormState {
  title: string;
  priority: "Low" | "Medium" | "High";
  assigneeId: string;
  dueDate: string;
}

const emptyForm: FormState = { title: "", priority: "Medium", assigneeId: "", dueDate: "" };

export function ProjectTasksSection({ project }: { project: Project }) {
  const { addTask, updateTask, removeTask, members, getMember, role } = useApp();
  const canEdit = ROLE_POLICIES[role].canEditProject;

  // parentTaskId being added against (undefined for top-level, taskId for a subtask)
  const [addingFor, setAddingFor] = useState<string | "ROOT" | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  // Group tasks by parent
  const topLevel = useMemo(() => project.tasks.filter((t) => !t.parentTaskId), [project.tasks]);
  const childrenOf = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of project.tasks) {
      if (!t.parentTaskId) continue;
      const list = map.get(t.parentTaskId) ?? [];
      list.push(t);
      map.set(t.parentTaskId, list);
    }
    return map;
  }, [project.tasks]);

  const stats = useMemo(() => {
    const total = project.tasks.length;
    const done = project.tasks.filter((t) => t.status === "Done").length;
    const blocked = project.tasks.filter((t) => t.status === "Blocked").length;
    return { total, done, blocked };
  }, [project.tasks]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    addTask(project.id, {
      title: form.title.trim(),
      priority: form.priority,
      assigneeId: form.assigneeId || undefined,
      dueDate: form.dueDate || undefined,
      parentTaskId: addingFor === "ROOT" ? undefined : addingFor ?? undefined,
    });
    setForm(emptyForm);
    setAddingFor(null);
  }

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-700">
          Tasks ({stats.total}) · {stats.done} done
          {stats.blocked ? ` · ${stats.blocked} blocked` : ""}
        </h2>
        {canEdit ? (
          <button
            onClick={() => {
              setAddingFor(addingFor === "ROOT" ? null : "ROOT");
              setForm(emptyForm);
            }}
            className="text-xs font-medium text-brand-600 hover:underline"
          >
            {addingFor === "ROOT" ? "Cancel" : "+ Add task"}
          </button>
        ) : null}
      </div>

      {addingFor === "ROOT" && canEdit ? (
        <TaskForm form={form} setForm={setForm} onSubmit={submit} membersList={members} getMember={getMember} label="New top-level task" />
      ) : null}

      <ul className="mt-3 space-y-2">
        {topLevel.length === 0 ? (
          <li className="py-2 text-sm text-slate-400">No tasks yet. Break the work down and add the first one.</li>
        ) : (
          topLevel.map((t) => (
            <TaskRow
              key={t.id}
              project={project}
              task={t}
              children={childrenOf.get(t.id) ?? []}
              canEdit={canEdit}
              addingFor={addingFor}
              form={form}
              setForm={setForm}
              setAddingFor={setAddingFor}
              submit={submit}
              onStatusChange={(status) => updateTask(project.id, t.id, { status })}
              onChildStatusChange={(taskId, status) => updateTask(project.id, taskId, { status })}
              onRemove={() => removeTask(project.id, t.id)}
              onRemoveChild={(taskId) => removeTask(project.id, taskId)}
              members={members}
              getMember={getMember}
            />
          ))
        )}
      </ul>
    </div>
  );
}

function TaskRow({
  project,
  task,
  children,
  canEdit,
  addingFor,
  form,
  setForm,
  setAddingFor,
  submit,
  onStatusChange,
  onChildStatusChange,
  onRemove,
  onRemoveChild,
  members,
  getMember,
}: {
  project: Project;
  task: Task;
  children: Task[];
  canEdit: boolean;
  addingFor: string | "ROOT" | null;
  form: FormState;
  setForm: (f: FormState) => void;
  setAddingFor: (v: string | "ROOT" | null) => void;
  submit: (e: React.FormEvent) => void;
  onStatusChange: (s: TaskStatus) => void;
  onChildStatusChange: (taskId: string, s: TaskStatus) => void;
  onRemove: () => void;
  onRemoveChild: (taskId: string) => void;
  members: ReturnType<typeof useApp>["members"];
  getMember: ReturnType<typeof useApp>["getMember"];
}) {
  const a = task.assigneeId ? getMember(task.assigneeId) : undefined;
  const isAddingSub = addingFor === task.id;

  return (
    <li className="rounded-lg border border-slate-100 bg-white p-2">
      <TaskHeader
        task={task}
        canEdit={canEdit}
        onStatusChange={onStatusChange}
        onRemove={onRemove}
        assigneeName={a?.name}
        onAddSub={() => {
          setAddingFor(isAddingSub ? null : task.id);
          setForm({ ...emptyForm });
        }}
        isAddingSub={isAddingSub}
      />

      {isAddingSub && canEdit ? (
        <div className="mt-2 pl-7">
          <TaskForm form={form} setForm={setForm} onSubmit={submit} membersList={members} getMember={getMember} label={`Sub-task of "${task.title}"`} />
        </div>
      ) : null}

      {children.length > 0 ? (
        <ul className="mt-2 space-y-1 border-l-2 border-slate-100 pl-3">
          {children.map((c) => {
            const ca = c.assigneeId ? getMember(c.assigneeId) : undefined;
            return (
              <li key={c.id} className="rounded-lg p-1 hover:bg-slate-50">
                <TaskHeader
                  task={c}
                  canEdit={canEdit}
                  isSub
                  onStatusChange={(s) => onChildStatusChange(c.id, s)}
                  onRemove={() => onRemoveChild(c.id)}
                  assigneeName={ca?.name}
                />
              </li>
            );
          })}
        </ul>
      ) : null}
    </li>
  );
}

function TaskHeader({
  task,
  canEdit,
  isSub,
  onStatusChange,
  onRemove,
  assigneeName,
  onAddSub,
  isAddingSub,
}: {
  task: Task;
  canEdit: boolean;
  isSub?: boolean;
  onStatusChange: (s: TaskStatus) => void;
  onRemove: () => void;
  assigneeName?: string;
  onAddSub?: () => void;
  isAddingSub?: boolean;
}) {
  const isDone = task.status === "Done";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => canEdit && onStatusChange(isDone ? "Todo" : "Done")}
        disabled={!canEdit}
        aria-label={isDone ? "Mark as todo" : "Mark as done"}
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${isDone ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white"} ${canEdit ? "cursor-pointer" : "cursor-default"}`}
      >
        {isDone ? <span className="text-[10px] leading-none">✓</span> : null}
      </button>
      <span className={`flex-1 text-sm ${isDone ? "text-slate-400 line-through" : "text-slate-800"}`}>
        {task.title}
      </span>
      <span className={`text-[11px] font-medium ${PRIORITY_STYLES[task.priority]}`}>{task.priority}</span>
      {assigneeName ? <span className="text-[11px] text-slate-500">@ {assigneeName}</span> : null}
      {task.dueDate ? <span className="text-[11px] text-slate-400">due {formatDate(task.dueDate)}</span> : null}
      <select
        value={task.status}
        onChange={(e) => onStatusChange(e.target.value as TaskStatus)}
        disabled={!canEdit}
        className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[task.status]} ${canEdit ? "" : "cursor-default"}`}
      >
        {STATUSES.map((s) => <option key={s}>{s}</option>)}
      </select>
      {!isSub && canEdit && onAddSub ? (
        <button onClick={onAddSub} className="text-[11px] text-brand-600 hover:underline">
          {isAddingSub ? "cancel" : "+ sub-task"}
        </button>
      ) : null}
      {canEdit ? (
        <button onClick={onRemove} className="text-[11px] text-rose-500 hover:underline">
          delete
        </button>
      ) : null}
    </div>
  );
}

function TaskForm({
  form,
  setForm,
  onSubmit,
  membersList,
  getMember,
  label,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  onSubmit: (e: React.FormEvent) => void;
  membersList: ReturnType<typeof useApp>["members"];
  getMember: ReturnType<typeof useApp>["getMember"];
  label: string;
}) {
  return (
    <form onSubmit={onSubmit} className="mt-2 grid gap-2 rounded-lg border border-slate-100 bg-slate-50/70 p-2 sm:grid-cols-5">
      <div className="sm:col-span-5 text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
      <input
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        placeholder="Task title"
        className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm sm:col-span-2"
        required
      />
      <select
        value={form.priority}
        onChange={(e) => setForm({ ...form, priority: e.target.value as FormState["priority"] })}
        className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
      >
        {(["Low", "Medium", "High"] as const).map((p) => <option key={p}>{p}</option>)}
      </select>
      <select
        value={form.assigneeId}
        onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
        className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
      >
        <option value="">Unassigned</option>
        {membersList.map((mb) => (
          <option key={mb.id} value={mb.id}>{getMember(mb.id)?.name}</option>
        ))}
      </select>
      <input
        type="date"
        value={form.dueDate}
        onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
        className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
      />
      <div className="sm:col-span-5">
        <button type="submit" className="btn-primary">Add task</button>
      </div>
    </form>
  );
}
