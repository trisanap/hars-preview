import { useState } from "react";
import { api } from "./api";
import { useLang } from "./i18n";

export default function MigrateDialog({ onComplete }) {
  const { t } = useLang();
  const [status, setStatus] = useState("idle"); // idle | migrating | done | error
  const [progress, setProgress] = useState("");

  const startMigration = async () => {
    setStatus("migrating");
    try {
      // Migrate registrations
      setProgress(t("migratingRegs"));
      const regs = await getAllFromIDB("registrations");
      for (const reg of regs) {
        try {
          await api.createRegistration(reg);
        } catch (e) {
          console.warn("Skip registration", reg.id, e.message);
        }
      }

      // Migrate app state (ST/SPK metadata, foto metadata)
      setProgress(t("migratingState"));
      const allState = await getAllFromIDB("app_state");
      for (const s of allState) {
        try {
          await api.setState(s.key, s.value);
        } catch (e) {
          console.warn("Skip state", s.key, e.message);
        }
      }

      // Migrate users (with temp password)
      setProgress(t("migratingUsers"));
      const users = await getAllFromIDB("users");
      for (const u of users) {
        try {
          await api.createUser({
            username: u.username,
            password: "reset123",
            nama: u.nama,
            role: u.role,
          });
        } catch (e) {
          console.warn("Skip user", u.username, e.message);
        }
      }

      // Migrate reports
      setProgress(t("migratingReports"));
      const reports = await getAllFromIDB("reports");
      for (const r of reports) {
        try {
          await api.saveReport(r.id, {
            lulus: r.lulus ?? true,
            data_json: {
              fasilitas: r.fasilitas || [],
              penyelia: r.penyelia || [],
              produk: r.produk || [],
              bahan: r.bahan || [],
              kriteria: r.kriteria || [],
            },
            status: r.status || "draft",
          });
        } catch (e) {
          console.warn("Skip report", r.id, e.message);
        }
      }

      // Migrate auditors
      setProgress(t("migratingAuditors"));
      const auditors = await getAllFromIDB("auditors");
      for (const a of auditors) {
        try {
          await api
            .request("POST", "/auditors", { nama: a.nama, reg: a.reg || "", jk: a.jk })
            .catch(() => {});
        } catch (_) {}
      }

      setStatus("done");
      setTimeout(onComplete, 2000);
    } catch (e) {
      setStatus("error");
      setProgress(e.message);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 3000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 8,
          padding: 24,
          maxWidth: 400,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        <h3 style={{ margin: "0 0 12px", color: "#0a6fc0" }}>{t("migrateTitle")}</h3>
        <p style={{ fontSize: 13, color: "#555", lineHeight: 1.6 }}>
          {t("migrateDesc")}
        </p>
        {status === "idle" && (
          <button
            onClick={startMigration}
            style={{
              background: "#0a6fc0",
              color: "#fff",
              border: "none",
              borderRadius: 5,
              padding: "8px 20px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t("migrateBtn")}
          </button>
        )}
        {status === "migrating" && (
          <p style={{ fontSize: 13, color: "#0a6fc0" }}>{progress}</p>
        )}
        {status === "done" && (
          <p style={{ fontSize: 13, color: "#1b5e20" }}>
            {t("migrateDone")}
          </p>
        )}
        {status === "error" && (
          <div>
            <p style={{ fontSize: 13, color: "#c0392b" }}>{t("migrateError")}{progress}</p>
            <button
              onClick={() => setStatus("idle")}
              style={{
                background: "#c0392b",
                color: "#fff",
                border: "none",
                borderRadius: 5,
                padding: "8px 20px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {t("retryBtn")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function getAllFromIDB(storeName) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("hars_db", 2);
    req.onsuccess = (e) => {
      const db = e.target.result;
      const tx = db.transaction(storeName, "readonly");
      const getAllReq = tx.objectStore(storeName).getAll();
      getAllReq.onsuccess = () => {
        resolve(getAllReq.result);
        db.close();
      };
      getAllReq.onerror = () => {
        reject(getAllReq.error);
        db.close();
      };
    };
    req.onerror = () => reject(req.error);
  });
}
