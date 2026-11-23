import React, { useEffect, useState } from "react";

import {
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "firebase/auth";

import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  writeBatch
} from "firebase/firestore";

import { auth, googleProvider, db } from "./firebase";

import {
  Heart,
  Wallet,
  Droplets,
  CalendarDays,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  LogOut,
  Home,
  BriefcaseBusiness,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X
} from "lucide-react";

import "./App.css";

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const money = value =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(value || 0));

const defaults = [
  { name: "Ibadah", type: "habit" },
  { name: "Mengaji", type: "habit" },
  { name: "Saving", type: "saving" },
  { name: "Minum Air Putih", type: "water" },
  { name: "Olahraga", type: "habit" },
  { name: "Skincare", type: "habit" }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menu, setMenu] = useState("Dashboard");

  const [trackers, setTrackers] = useState([]);
  const [entries, setEntries] = useState([]);
  const [tasks, setTasks] = useState([]);

  const [newTracker, setNewTracker] = useState("");
  const [trackerType, setTrackerType] = useState("habit");

  const [newTask, setNewTask] = useState("");
  const [taskCategory, setTaskCategory] = useState("Pribadi");

  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());

  const [selected, setSelected] = useState(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  const userCollection = name =>
    collection(db, "users", user.uid, name);

  // AUTHENTICATION

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // FIRESTORE LISTENERS

  useEffect(() => {
    if (!user) {
      setTrackers([]);
      setEntries([]);
      setTasks([]);
      return;
    }

    setError("");

    const unsub1 = onSnapshot(
      userCollection("trackers"),
      async snap => {
        const data = snap.docs.map(d => ({
          id: d.id,
          ...d.data()
        }));

        setTrackers(data);

        if (snap.empty) {
          try {
            const batch = writeBatch(db);

            defaults.forEach(tracker => {
              const id = tracker.name
                .toLowerCase()
                .replace(/\s+/g, "-");

              batch.set(
                doc(db, "users", user.uid, "trackers", id),
                tracker
              );
            });

            await batch.commit();
          } catch (err) {
            console.error(err);
            setError("Gagal membuat tracker awal.");
          }
        }
      },
      err => {
        console.error(err);
        setError("Gagal membaca tracker: " + err.message);
      }
    );

    const unsub2 = onSnapshot(
      userCollection("entries"),
      snap => {
        setEntries(
          snap.docs.map(d => ({
            id: d.id,
            ...d.data()
          }))
        );
      },
      err => {
        console.error(err);
        setError("Gagal membaca catatan.");
      }
    );

    const unsub3 = onSnapshot(
      userCollection("tasks"),
      snap => {
        setTasks(
          snap.docs.map(d => ({
            id: d.id,
            ...d.data()
          }))
        );
      },
      err => {
        console.error(err);
        setError("Gagal membaca agenda.");
      }
    );

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [user]);
  
  // LOGIN

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error(err);
      alert("Login gagal: " + err.message);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      alert("Gagal keluar: " + err.message);
    }
  };

  // ADD TRACKER

  const addTracker = async () => {
    if (!newTracker.trim()) {
      alert("Nama tracker tidak boleh kosong.");
      return;
    }

    try {
      await addDoc(userCollection("trackers"), {
        name: newTracker.trim(),
        type: trackerType,
        createdAt: Date.now()
      });

      setNewTracker("");
    } catch (err) {
      alert("Gagal menambahkan tracker: " + err.message);
    }
  };

  // DELETE TRACKER

  const removeTracker = async id => {
    if (!window.confirm("Hapus tracker beserta riwayatnya?")) return;

    try {
      const batch = writeBatch(db);

      entries
        .filter(e => e.trackerId === id)
        .forEach(entry => {
          batch.delete(
            doc(db, "users", user.uid, "entries", entry.id)
          );
        });

      batch.delete(
        doc(db, "users", user.uid, "trackers", id)
      );

      await batch.commit();
    } catch (err) {
      alert("Gagal menghapus tracker: " + err.message);
    }
  };

  // SAVE ENTRY

  const saveEntry = async () => {
    if (!selected) return;

    if (
      selected.type !== "habit" &&
      (
        value.trim() === "" ||
        !Number.isFinite(Number(value)) ||
        Number(value) < 0
      )
    ) {
      alert("Masukkan angka yang valid.");
      return;
    }

    try {
      const ref = doc(
        db,
        "users",
        user.uid,
        "entries",
        `${selected.id}_${selected.day}`
      );

      await setDoc(ref, {
        trackerId: selected.id,
        trackerName: selected.name,
        date: selected.day,
        type: selected.type,
        value:
          selected.type === "habit"
            ? true
            : Number(value),
        updatedAt: Date.now()
      });

      setSelected(null);
      setValue("");
    } catch (err) {
      alert("Gagal menyimpan: " + err.message);
    }
  };

  // TASKS

  const addTask = async () => {
    if (!newTask.trim()) {
      alert("Agenda tidak boleh kosong.");
      return;
    }

    try {
      await addDoc(userCollection("tasks"), {
        title: newTask.trim(),
        category: taskCategory,
        completed: false,
        date: today(),
        createdAt: Date.now()
      });

      setNewTask("");
    } catch (err) {
      alert("Gagal menambahkan agenda: " + err.message);
    }
  };

  const toggleTask = async task => {
    try {
      await setDoc(
        doc(db, "users", user.uid, "tasks", task.id),
        { completed: !task.completed },
        { merge: true }
      );
    } catch (err) {
      alert("Gagal mengubah agenda: " + err.message);
    }
  };

  const deleteTask = async id => {
    try {
      await deleteDoc(
        doc(db, "users", user.uid, "tasks", id)
      );
    } catch (err) {
      alert("Gagal menghapus agenda: " + err.message);
    }
  };

  // CALENDAR

  const changeMonth = direction => {
    const d = new Date(year, month + direction, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const monthDays = new Date(year, month + 1, 0).getDate();

  const monthName = new Date(year, month).toLocaleDateString(
    "id-ID",
    { month: "long", year: "numeric" }
  );

  const getEntry = (id, day) => {
    const date =
      `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    return entries.find(
      e => e.trackerId === id && e.date === date
    );
  };

  // STATISTICS

  const totalSaving = entries
    .filter(e => e.type === "saving")
    .reduce((sum, e) => sum + Number(e.value || 0), 0);

  const todayTasks = tasks.filter(t => t.date === today());

  const totalDone = todayTasks.filter(t => t.completed).length;

  const progress = todayTasks.length
    ? Math.round(totalDone / todayTasks.length * 100)
    : 0;

  // LOADING

  if (loading) {
    return (
      <div className="loading">
        Loading My Daily Journal ♡
      </div>
    );
  }

  // LOGIN SCREEN

  if (!user) {
    return (
      <main className="login-screen">
        <div className="login-card">
          <div className="logo">♡</div>

          <p className="eyebrow">
            YOUR PERSONAL LIFE ORGANIZER
          </p>

          <h1>My Daily Journal</h1>

          <p>
            Plan your day, track your habits, and grow every day.
          </p>

          <button className="primary full" onClick={login}>
            Masuk dengan Google
          </button>

          <small>
            Jurnal pribadi • Aman • Tersimpan online
          </small>

          <footer className="login-footer">
            Made with ❤️ by <b>ZuliTwin</b>
          </footer>
        </div>
      </main>
    );
  }

  // NAVIGATION

  const nav = [
    ["Dashboard", <Home />],
    ["Ibadah Tracker", <Heart />],
    ["Saving Tracker", <Wallet />],
    ["Water Tracker", <Droplets />],
    ["My Habits", <Sparkles />],
    ["Daily Agenda", <CalendarDays />]
  ];

  const activeTrackers =
    menu === "Ibadah Tracker"
      ? trackers.filter(
          t => t.name === "Ibadah" || t.name === "Mengaji"
        )
      : menu === "Saving Tracker"
      ? trackers.filter(t => t.type === "saving")
      : menu === "Water Tracker"
      ? trackers.filter(t => t.type === "water")
      : menu === "My Habits"
      ? trackers.filter(t => t.type === "habit")
      : [];

  const iconFor = name => {
    if (name === "Ibadah") return <Heart />;
    if (name === "Saving") return <Wallet />;
    if (name.includes("Air")) return <Droplets />;
    if (name === "Office Work") return <BriefcaseBusiness />;
    return <Sparkles />;
  };

  const openTracker = tracker => {
    const date = today();

    const existing = entries.find(
      e => e.trackerId === tracker.id && e.date === date
    );

    setSelected({
      id: tracker.id,
      name: tracker.name,
      type: tracker.type,
      day: date
    });

    setValue(existing?.value?.toString() || "");
  };

  const openCalendarEntry = (tracker, date) => {
    const existing = entries.find(
      e => e.trackerId === tracker.id && e.date === date
    );

    setSelected({
      id: tracker.id,
      name: tracker.name,
      type: tracker.type,
      day: date
    });

    setValue(existing?.value?.toString() || "");
  };

  // MAIN APP

  return (
    <div className="app">

      <aside className="sidebar">

        <div className="brand">
          ♡ My Daily Journal
        </div>

        <div className="user-info">
          <img
            src={user.photoURL || ""}
            alt="Profile"
          />

          <div>
            <b>{user.displayName || "User"}</b>
            <small>{user.email}</small>
          </div>
        </div>

        <nav>
          {nav.map(([name, icon]) => (
            <button
              key={name}
              className={
                menu === name
                  ? "nav-item active"
                  : "nav-item"
              }
              onClick={() => setMenu(name)}
            >
              {icon}
              <span>{name}</span>
            </button>
          ))}
        </nav>

        <button className="logout" onClick={logout}>
          <LogOut /> Keluar
        </button>

        <div className="sidebar-footer">
          Made with ❤️ by
          <strong>ZuliTwin</strong>
          <small>© 2026 My Daily Journal</small>
        </div>

      </aside>

      <main className="content">

        <header className="topbar">
          <div>
            <p className="eyebrow">
              YOUR LITTLE STEPS MATTER ♡
            </p>

            <h1>
              {menu === "Dashboard"
                ? "Hello, Beautiful!"
                : menu}
            </h1>
          </div>

          <div className="today-label">
            {new Date().toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric"
            })}
          </div>
        </header>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* DASHBOARD */}

        {menu === "Dashboard" && (
          <>
            <section className="welcome">
              <h2>Make today beautiful 🌷</h2>
              <p>Setiap langkah kecil adalah kemajuan.</p>
            </section>

            <div className="stats">

              <div className="stat">
                <Wallet />
                <small>Total tabungan tercatat</small>
                <b>{money(totalSaving)}</b>
              </div>

              <div className="stat">
                <CheckCircle2 />
                <small>Agenda selesai hari ini</small>
                <b>{totalDone}/{todayTasks.length}</b>
              </div>

              <div className="stat">
                <Sparkles />
                <small>Progress agenda hari ini</small>
                <b>{progress}%</b>
              </div>

            </div>

            <section className="panel">
              <h2>Daily Agenda ♡</h2>

              <div className="task-form">

                <input
                  value={newTask}
                  onChange={e => setNewTask(e.target.value)}
                  placeholder="Tulis agenda baru..."
                />

                <select
                  value={taskCategory}
                  onChange={e => setTaskCategory(e.target.value)}
                >
                  <option>Pribadi</option>
                  <option>Kantor</option>
                  <option>Rumah</option>
                </select>

                <button className="primary" onClick={addTask}>
                  <Plus /> Tambah
                </button>

              </div>

              {todayTasks.map(task => (
                <div
                  className={`task ${task.completed ? "done" : ""}`}
                  key={task.id}
                >
                  <button onClick={() => toggleTask(task)}>
                    {task.completed
                      ? <CheckCircle2 />
                      : <Circle />}
                  </button>

                  <span>{task.title}</span>
                  <small>{task.category}</small>

                  <button
                    className="delete"
                    onClick={() => deleteTask(task.id)}
                  >
                    <Trash2 />
                  </button>
                </div>
              ))}

              {todayTasks.length === 0 && (
                <p className="empty">
                  Belum ada agenda hari ini 🌷
                </p>
              )}

            </section>

            <section className="panel">
              <h2>My Monthly Trackers</h2>

              <div className="tracker-shortcuts">
                {trackers.map(t => (
                  <button
                    key={t.id}
                    onClick={() => openTracker(t)}
                  >
                    {iconFor(t.name)}
                    <span>{t.name}</span>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {/* TRACKER CALENDAR */}

        {activeTrackers.length > 0 && (
          <section className="panel">

            <div className="month-heading">

              <button onClick={() => changeMonth(-1)}>
                <ChevronLeft />
              </button>

              <h2>{monthName}</h2>

              <button onClick={() => changeMonth(1)}>
                <ChevronRight />
              </button>

            </div>

            {activeTrackers.map(tracker => {

              const monthlyEntries = entries.filter(e =>
                e.trackerId === tracker.id &&
                e.date.startsWith(
                  `${year}-${String(month + 1).padStart(2, "0")}`
                )
              );

              const monthlyTotal = monthlyEntries.reduce(
                (sum, e) => sum + Number(e.value || 0),
                0
              );

              return (
                <div className="monthly-tracker" key={tracker.id}>

                  <div className="tracker-title">

                    <h3>
                      {iconFor(tracker.name)}
                      {tracker.name}
                    </h3>

                    <span>
                      {monthlyEntries.length}/{monthDays} hari
                    </span>

                    <button
                      className="delete"
                      onClick={() => removeTracker(tracker.id)}
                    >
                      <Trash2 />
                    </button>

                  </div>

                  <div className="calendar-grid">

                    {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map(d => (
                      <b key={d}>{d}</b>
                    ))}

                    {Array.from(
                      { length: new Date(year, month, 1).getDay() },
                      (_, i) => <span key={"blank" + i} />
                    )}

                    {Array.from(
                      { length: monthDays },
                      (_, i) => {

                        const day = i + 1;

                        const date =
                          `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

                        const entry = getEntry(tracker.id, day);

                        const done = entry && (
                          entry.type === "habit"
                            ? entry.value === true
                            : Number(entry.value) > 0
                        );

                        return (
                          <button
                            key={day}
                            className={
                              `day-circle ${done ? "checked" : ""}`
                            }
                            onClick={() =>
                              openCalendarEntry(tracker, date)
                            }
                          >
                            {done ? "✓" : day}
                          </button>
                        );
                      }
                    )}

                  </div>

                  {tracker.type === "saving" && (
                    <p className="tracker-total">
                      Total bulan ini: {money(monthlyTotal)}
                    </p>
                  )}

                  {tracker.type === "water" && (
                    <p className="tracker-total">
                      Total bulan ini: {monthlyTotal} gelas
                    </p>
                  )}

                </div>
              );
            })}

          </section>
        )}

        {/* MY HABITS */}

        {menu === "My Habits" && (
          <section className="panel">

            <h2>Tambah Habit Tracker ♡</h2>

            <div className="task-form">

              <input
                value={newTracker}
                onChange={e => setNewTracker(e.target.value)}
                placeholder="Contoh: Membaca buku"
              />

              <select
                value={trackerType}
                onChange={e => setTrackerType(e.target.value)}
              >
                <option value="habit">Checklist</option>
                <option value="saving">Saving</option>
                <option value="water">Water</option>
              </select>

              <button className="primary" onClick={addTracker}>
                <Plus /> Tambah
              </button>

            </div>

            {trackers.map(t => (
              <div className="task" key={t.id}>
                <span>{t.name}</span>
                <small>{t.type}</small>

                <button
                  className="delete"
                  onClick={() => removeTracker(t.id)}
                >
                  <Trash2 />
                </button>
              </div>
            ))}

          </section>
        )}

        {/* DAILY AGENDA */}

        {menu === "Daily Agenda" && (
          <section className="panel">

            <h2>Agenda Hari Ini ♡</h2>

            <div className="task-form">

              <input
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
                placeholder="Tambahkan agenda..."
              />

              <select
                value={taskCategory}
                onChange={e => setTaskCategory(e.target.value)}
              >
                <option>Pribadi</option>
                <option>Kantor</option>
                <option>Rumah</option>
              </select>

              <button className="primary" onClick={addTask}>
                <Plus /> Tambah
              </button>

            </div>

            {todayTasks.map(task => (
              <div
                className={`task ${task.completed ? "done" : ""}`}
                key={task.id}
              >

                <button onClick={() => toggleTask(task)}>
                  {task.completed
                    ? <CheckCircle2 />
                    : <Circle />}
                </button>

                <span>{task.title}</span>
                <small>{task.category}</small>

                <button
                  className="delete"
                  onClick={() => deleteTask(task.id)}
                >
                  <Trash2 />
                </button>

              </div>
            ))}

          </section>
        )}

        {/* ADD TRACKER */}

        {[
          "Ibadah Tracker",
          "Saving Tracker",
          "Water Tracker"
        ].includes(menu) && (
          <section className="panel">

            <h2>Tambah Tracker ♡</h2>

            <div className="task-form">

              <input
                value={newTracker}
                onChange={e => setNewTracker(e.target.value)}
                placeholder="Nama tracker baru..."
              />

              <select
                value={trackerType}
                onChange={e => setTrackerType(e.target.value)}
              >
                <option value="habit">Checklist</option>
                <option value="saving">Saving</option>
                <option value="water">Water</option>
              </select>

              <button className="primary" onClick={addTracker}>
                <Plus /> Tambah
              </button>

            </div>

          </section>
        )}

      </main>

      {/* ENTRY MODAL */}

      {selected && (
        <div
          className="modal-backdrop"
          onClick={e => {
            if (e.target === e.currentTarget) {
              setSelected(null);
            }
          }}
        >

          <div className="modal">

            <button
              className="close"
              onClick={() => setSelected(null)}
            >
              <X />
            </button>

            <h2>{selected.name}</h2>
            <p>{selected.day}</p>

            {selected.type === "habit" ? (
              <label className="habit-question">
                <input
                  type="checkbox"
                  checked={value === "true"}
                  onChange={e =>
                    setValue(e.target.checked ? "true" : "")
                  }
                />

                Apakah target hari ini sudah dilakukan?
              </label>
            ) : (
              <>
                <label>
                  {selected.type === "saving"
                    ? "Nominal tabungan (Rupiah)"
                    : "Jumlah gelas air putih"}
                </label>

                <input
                  type="number"
                  min="0"
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  placeholder={
                    selected.type === "saving"
                      ? "Contoh: 10000"
                      : "Contoh: 8"
                  }
                />
              </>
            )}

            <button
              className="primary full"
              onClick={saveEntry}
            >
              Simpan catatan
            </button>

            <button
              className="secondary full"
              onClick={async () => {
                try {
                  await deleteDoc(
                    doc(
                      db,
                      "users",
                      user.uid,
                      "entries",
                      `${selected.id}_${selected.day}`
                    )
                  );

                  setSelected(null);
                  setValue("");
                } catch (err) {
                  alert("Gagal menghapus: " + err.message);
                }
              }}
            >
              Hapus catatan hari ini
            </button>

          </div>

        </div>
      )}

    </div>
  );
}
