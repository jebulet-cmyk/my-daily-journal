
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
  setDoc
} from "firebase/firestore";

import {
  auth,
  googleProvider,
  db
} from "./firebase";

import {
  Heart, Wallet, Droplets, CalendarDays,
  CheckCircle2, Circle, Plus, Trash2,
  LogOut, Home, BriefcaseBusiness, Sparkles,
  ChevronLeft, ChevronRight, X
} from "lucide-react";

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

const money = value =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(value || 0));

const defaults = [
  {name:"Ibadah",type:"habit"},
  {name:"Mengaji",type:"habit"},
  {name:"Saving",type:"saving"},
  {name:"Minum Air Putih",type:"water"},
  {name:"Olahraga",type:"habit"},
  {name:"Skincare",type:"habit"}
];

export default function App() {
  const [user,setUser] = useState(null);
  const [loading,setLoading] = useState(true);
  const [menu,setMenu] = useState("Dashboard");

  const [trackers,setTrackers] = useState([]);
  const [entries,setEntries] = useState([]);
  const [tasks,setTasks] = useState([]);

  const [newTracker,setNewTracker] = useState("");
  const [trackerType,setTrackerType] = useState("habit");
  const [newTask,setNewTask] = useState("");
  const [taskCategory,setTaskCategory] = useState("Pribadi");

  const [year,setYear] = useState(new Date().getFullYear());
  const [month,setMonth] = useState(new Date().getMonth());

  const [selected,setSelected] = useState(null);
  const [value,setValue] = useState("");

  const userCollection = name =>
    collection(db,"users",user.uid,name);

  useEffect(() => {
    return onAuthStateChanged(auth, u => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  
  useEffect(() => {
    if (!user) return;

    const unsub1 = onSnapshot(
      userCollection("trackers"),
      async snap => {
        setTrackers(snap.docs.map(d => ({
          id: d.id,
          ...d.data()
        })));

        if (snap.empty) {
          for (const tracker of defaults) {
            const id = tracker.name
              .toLowerCase()
              .replaceAll(" ", "-");

            await setDoc(
              doc(db, "users", user.uid, "trackers", id),
              tracker
            );
          }
        }
      }
    );

    const unsub2 = onSnapshot(
      userCollection("entries"),
      snap => {
        setEntries(snap.docs.map(d => ({
          id: d.id,
          ...d.data()
        })));
      }
    );

    const unsub3 = onSnapshot(
      userCollection("tasks"),
      snap => {
        setTasks(snap.docs.map(d => ({
          id: d.id,
          ...d.data()
        })));
      }
    );

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [user]);

  const login = () =>
    signInWithPopup(auth,googleProvider);

  const addTracker = async () => {
    if (!newTracker.trim()) return;

    await addDoc(userCollection("trackers"),{
      name:newTracker.trim(),
      type:trackerType,
      createdAt:Date.now()
    });

    setNewTracker("");
  };

  const removeTracker = async id => {
    if (!window.confirm("Hapus tracker ini beserta riwayatnya?")) return;

    const related=entries.filter(e=>e.trackerId===id);

    await Promise.all(related.map(e=>
      deleteDoc(doc(db,"users",user.uid,"entries",e.id))
    ));

    await deleteDoc(doc(db,"users",user.uid,"trackers",id));
  };

  const saveEntry = async () => {
    if (!selected) return;

    const ref=doc(
      db,"users",user.uid,"entries",
      `${selected.id}_${selected.day}`
    );

    await setDoc(ref,{
      trackerId:selected.id,
      trackerName:selected.name,
      date:selected.day,
      type:selected.type,
      value:selected.type==="habit"?true:Number(value),
      updatedAt:Date.now()
    });

    setSelected(null);
    setValue("");
  };

  const addTask = async () => {
    if (!newTask.trim()) return;

    await addDoc(userCollection("tasks"),{
      title:newTask.trim(),
      category:taskCategory,
      completed:false,
      date:today(),
      createdAt:Date.now()
    });

    setNewTask("");
  };

  const toggleTask = async task => {
    await setDoc(
      doc(db,"users",user.uid,"tasks",task.id),
      {completed:!task.completed},
      {merge:true}
    );
  };

  const deleteTask = async id => {
    await deleteDoc(
      doc(db,"users",user.uid,"tasks",id)
    );
  };

  const changeMonth = direction => {
    const d=new Date(year,month+direction,1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const monthDays=new Date(year,month+1,0).getDate();

  const monthName=new Date(year,month).toLocaleDateString(
    "id-ID",{month:"long",year:"numeric"}
  );

  const getEntry=(id,day)=>{
    const date=`${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    return entries.find(e=>e.trackerId===id && e.date===date);
  };

  const totalSaving=entries
    .filter(e=>e.type==="saving")
    .reduce((s,e)=>s+Number(e.value||0),0);

  const totalDone=tasks.filter(t=>t.completed).length;
  const progress=tasks.length?Math.round(totalDone/tasks.length*100):0;

  if (loading) {
    return <div className="loading">Loading My Daily Journal ♡</div>;
  }

  if (!user) {
    return (
      <main className="login-screen">
        <div className="login-card">
          <div className="logo">♡</div>
          <p className="eyebrow">YOUR PERSONAL LIFE ORGANIZER</p>
          <h1>My Daily Journal</h1>
          <p>Plan your day, track your habits, and grow every day.</p>
          <button className="primary full" onClick={login}>
            Masuk dengan Google
          </button>
          <small>Jurnal pribadi • Aman • Tersimpan online</small>
        </div>
      </main>
    );
  }

  const nav = [
    ["Dashboard",<Home/>],
    ["Ibadah Tracker",<Heart/>],
    ["Saving Tracker",<Wallet/>],
    ["Water Tracker",<Droplets/>],
    ["My Habits",<Sparkles/>],
    ["Daily Agenda",<CalendarDays/>]
  ];

  const activeTrackers =
    menu==="Ibadah Tracker"
      ? trackers.filter(t=>t.name==="Ibadah" || t.name==="Mengaji")
      : menu==="Saving Tracker"
      ? trackers.filter(t=>t.type==="saving")
      : menu==="Water Tracker"
      ? trackers.filter(t=>t.type==="water")
      : menu==="My Habits"
      ? trackers.filter(t=>t.type==="habit")
      : [];

  const openTracker = tracker => {
    const date=today();
    const existing=entries.find(
      e=>e.trackerId===tracker.id && e.date===date
    );

    setSelected({
      id:tracker.id,
      name:tracker.name,
      type:tracker.type,
      day:date
    });

    setValue(existing?.value?.toString() || "");
  };

  const iconFor = name => {
    if (name==="Ibadah") return <Heart/>;
    if (name==="Saving") return <Wallet/>;
    if (name.includes("Air")) return <Droplets/>;
    if (name==="Office Work") return <BriefcaseBusiness/>;
    return <Sparkles/>;
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">♡ My Daily Journal</div>

        <div className="user-info">
          <img src={user.photoURL} alt="Profile"/>
          <div>
            <b>{user.displayName}</b>
            <small>{user.email}</small>
          </div>
        </div>

        <nav>
          {nav.map(([name,icon])=>(
            <button
              key={name}
              className={menu===name?"nav-item active":"nav-item"}
              onClick={()=>setMenu(name)}
            >
              {icon}<span>{name}</span>
            </button>
          ))}
        </nav>

        <button className="logout" onClick={()=>signOut(auth)}>
          <LogOut/> Keluar
        </button>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">YOUR LITTLE STEPS MATTER ♡</p>
            <h1>{menu==="Dashboard"?"Hello, Beautiful!":menu}</h1>
          </div>
          <div className="today-label">
            {new Date().toLocaleDateString("id-ID",{
              weekday:"long",day:"numeric",
              month:"long",year:"numeric"
            })}
          </div>
        </header>

        {menu==="Dashboard" && (
          <>
            <section className="welcome">
              <h2>Make today beautiful 🌷</h2>
              <p>Setiap langkah kecil adalah kemajuan.</p>
            </section>

            <div className="stats">
              <div className="stat">
                <Wallet/>
                <small>Total tabungan tercatat</small>
                <b>{money(totalSaving)}</b>
              </div>

              <div className="stat">
                <CheckCircle2/>
                <small>Agenda selesai</small>
                <b>{totalDone}/{tasks.length}</b>
              </div>

              <div className="stat">
                <Sparkles/>
                <small>Progress agenda</small>
                <b>{progress}%</b>
              </div>
            </div>

            <section className="panel">
              <h2>Daily Agenda</h2>

              <div className="task-form">
                <input
                  value={newTask}
                  onChange={e=>setNewTask(e.target.value)}
                  placeholder="Tulis agenda baru..."
                />

                <select
                  value={taskCategory}
                  onChange={e=>setTaskCategory(e.target.value)}
                >
                  <option>Pribadi</option>
                  <option>Kantor</option>
                  <option>Rumah</option>
                </select>

                <button className="primary" onClick={addTask}>
                  <Plus/> Tambah
                </button>
              </div>

              {tasks.filter(t=>t.date===today()).map(task=>(
                <div className={`task ${task.completed?"done":""}`} key={task.id}>
                  <button onClick={()=>toggleTask(task)}>
                    {task.completed?<CheckCircle2/>:<Circle/>}
                  </button>
                  <span>{task.title}</span>
                  <small>{task.category}</small>
                  <button className="delete" onClick={()=>deleteTask(task.id)}>
                    <Trash2/>
                  </button>
                </div>
              ))}
            </section>

            <section className="panel">
              <h2>My Monthly Trackers</h2>
              <div className="tracker-shortcuts">
                {trackers.map(t=>(
                  <button key={t.id} onClick={()=>openTracker(t)}>
                    {iconFor(t.name)}
                    <span>{t.name}</span>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {activeTrackers.length>0 && (
          <section className="panel">
            <div className="month-heading">
              <button onClick={()=>changeMonth(-1)}>
                <ChevronLeft/>
              </button>
              <h2>{monthName}</h2>
              <button onClick={()=>changeMonth(1)}>
                <ChevronRight/>
              </button>
            </div>

            {activeTrackers.map(tracker=>{
              const completed=entries.filter(e=>
                e.trackerId===tracker.id &&
                e.date.startsWith(
                  `${year}-${String(month+1).padStart(2,"0")}`
                )
              ).length;

              return (
                <div className="monthly-tracker" key={tracker.id}>
                  <div className="tracker-title">
                    <h3>{iconFor(tracker.name)} {tracker.name}</h3>
                    <span>{completed}/{monthDays} hari</span>
                    <button className="delete" onClick={()=>removeTracker(tracker.id)}>
                      <Trash2/>
                    </button>
                  </div>

                  <div className="calendar-grid">
                    {["Min","Sen","Sel","Rab","Kam","Jum","Sab"].map(d=>(
                      <b key={d}>{d}</b>
                    ))}

                    {Array.from(
                      {length:new Date(year,month,1).getDay()},
                      (_,i)=><span key={"blank"+i}/>
                    )}

                    {Array.from({length:monthDays},(_,i)=>{
                      const day=i+1;
                      const date=`${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                      const entry=getEntry(tracker.id,day);
                      const done=entry && Number(entry.value)>0;

                      return (
                        <button
                          key={day}
                          className={`day-circle ${done?"checked":""}`}
                          onClick={()=>{
                            setSelected({
                              id:tracker.id,
                              name:tracker.name,
                              type:tracker.type,
                              day:date
                            });
                            setValue(entry?.value?.toString() || "");
                          }}
                        >
                          {done?"✓":day}
                        </button>
                      );
                    })}
                  </div>

                  {tracker.type==="saving" && (
                    <p className="tracker-total">
                      Total bulan ini: {money(entries.filter(e=>
                        e.trackerId===tracker.id &&
                        e.date.startsWith(
                          `${year}-${String(month+1).padStart(2,"0")}`
                        )
                      ).reduce((s,e)=>s+Number(e.value||0),0))}
                    </p>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {menu==="My Habits" && (
          <section className="panel">
            <h2>Tambah Habit Tracker ♡</h2>

            <div className="task-form">
              <input
                value={newTracker}
                onChange={e=>setNewTracker(e.target.value)}
                placeholder="Contoh: Membaca buku"
              />

              <select
                value={trackerType}
                onChange={e=>setTrackerType(e.target.value)}
              >
                <option value="habit">Checklist</option>
                <option value="saving">Saving</option>
                <option value="water">Water</option>
              </select>

              <button className="primary" onClick={addTracker}>
                <Plus/> Tambah
              </button>
            </div>

            {trackers.map(t=>(
              <div className="task" key={t.id}>
                <span>{t.name}</span>
                <small>{t.type}</small>
                <button className="delete" onClick={()=>removeTracker(t.id)}>
                  <Trash2/>
                </button>
              </div>
            ))}
          </section>
        )}

        {menu==="Daily Agenda" && (
          <section className="panel">
            <h2>Agenda Hari Ini ♡</h2>

            <div className="task-form">
              <input
                value={newTask}
                onChange={e=>setNewTask(e.target.value)}
                placeholder="Tambahkan agenda..."
              />

              <select
                value={taskCategory}
                onChange={e=>setTaskCategory(e.target.value)}
              >
                <option>Pribadi</option>
                <option>Kantor</option>
                <option>Rumah</option>
              </select>

              <button className="primary" onClick={addTask}>
                <Plus/> Tambah
              </button>
            </div>

            {tasks.filter(t=>t.date===today()).map(task=>(
              <div className={`task ${task.completed?"done":""}`} key={task.id}>
                <button onClick={()=>toggleTask(task)}>
                  {task.completed?<CheckCircle2/>:<Circle/>}
                </button>
                <span>{task.title}</span>
                <small>{task.category}</small>
                <button className="delete" onClick={()=>deleteTask(task.id)}>
                  <Trash2/>
                </button>
              </div>
            ))}
          </section>
        )}

        {["Ibadah Tracker","Saving Tracker","Water Tracker"].includes(menu) && (
          <section className="panel">
            <h2>Tambah Tracker ♡</h2>

            <div className="task-form">
              <input
                value={newTracker}
                onChange={e=>setNewTracker(e.target.value)}
                placeholder="Nama tracker baru..."
              />

              <select
                value={trackerType}
                onChange={e=>setTrackerType(e.target.value)}
              >
                <option value="habit">Checklist</option>
                <option value="saving">Saving</option>
                <option value="water">Water</option>
              </select>

              <button className="primary" onClick={addTracker}>
                <Plus/> Tambah
              </button>
            </div>
          </section>
        )}
      </main>

      {selected && (
        <div className="modal-backdrop">
          <div className="modal">
            <button className="close" onClick={()=>setSelected(null)}>
              <X/>
            </button>

            <h2>{selected.name}</h2>
            <p>{selected.day}</p>

            {selected.type==="habit" ? (
              <p>Apakah target hari ini sudah dilakukan?</p>
            ) : (
              <>
                <label>
                  {selected.type==="saving"
                    ? "Nominal tabungan (Rupiah)"
                    : "Jumlah gelas air putih"}
                </label>

                <input
                  type="number"
                  min="0"
                  value={value}
                  onChange={e=>setValue(e.target.value)}
                  placeholder={
                    selected.type==="saving"
                      ? "Contoh: 10000"
                      : "Contoh: 8"
                  }
                />
              </>
            )}

            <button className="primary full" onClick={saveEntry}>
              Simpan catatan
            </button>

            <button
              className="secondary full"
              onClick={async()=>{
                await deleteDoc(
                  doc(db,"users",user.uid,"entries",
                    `${selected.id}_${selected.day}`)
                );
                setSelected(null);
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
