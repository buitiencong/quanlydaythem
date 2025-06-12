let db;
let SQL;

// Khởi tạo SQLite và kiểm tra dữ liệu từ IndexedDB
initSqlJs({
  locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.6.2/${file}`
}).then(SQLLib => {
  SQL = SQLLib;

  localforage.getItem("userDB").then(buffer => {
    if (buffer) {
      db = new SQL.Database(new Uint8Array(buffer));
      document.getElementById("fileSelect").style.display = "none";
      loadClasses();
    }
  });

  document.getElementById("dbfile").addEventListener("change", event => {
    const reader = new FileReader();
    reader.onload = function () {
      const uint8array = new Uint8Array(reader.result);
      db = new SQL.Database(uint8array);
      localforage.setItem("userDB", uint8array);
      document.getElementById("fileSelect").style.display = "none";
      loadClasses();
    };
    reader.readAsArrayBuffer(event.target.files[0]);
  });
});

// Định dạng ngày dd-mm-yy
function formatDate(isoDate) {
  const d = new Date(isoDate);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
}

function loadClasses() {
  const tabs = document.getElementById("tabs");
  const contents = document.getElementById("tabContents");
  tabs.innerHTML = "";
  contents.innerHTML = "";

  let classes;
  try {
    classes = db.exec("SELECT class_id, class_name FROM Classes");
  } catch (err) {
    tabs.innerHTML = "<p>Lỗi: " + err.message + "</p>";
    return;
  }

  if (!classes.length) {
    tabs.innerHTML = "<p>Không có lớp học nào.</p>";
    return;
  }

  classes[0].values.forEach(([classId, className], index) => {
    const tabBtn = document.createElement("div");
    tabBtn.className = "tab-button" + (index === 0 ? " active" : "");
    tabBtn.textContent = className;
    tabBtn.dataset.classId = classId;
    tabBtn.onclick = () => switchTab(classId);
    tabs.appendChild(tabBtn);

    const contentDiv = document.createElement("div");
    contentDiv.className = "tab-content" + (index === 0 ? " active" : "");
    contentDiv.id = `tab-${classId}`;
    contents.appendChild(contentDiv);

    if (index === 0) showClassData(classId);
  });
}

function switchTab(classId) {
  document.querySelectorAll(".tab-button").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.classId == classId);
  });
  document.querySelectorAll(".tab-content").forEach(div => {
    div.classList.toggle("active", div.id === `tab-${classId}`);
  });
  showClassData(classId);
}

function showClassData(classId) {
  const container = document.getElementById(`tab-${classId}`);
  container.innerHTML = "<p>Đang tải...</p>";

  try {
    const studentResult = db.exec(`
      SELECT student_id, student_name FROM Students WHERE class_id = ${classId}
    `);
    const students = studentResult[0]?.values || [];

    const datesResult = db.exec(`
      SELECT DISTINCT attendance_date FROM Attendance
      WHERE class_id = ${classId} AND status = 1
      ORDER BY attendance_date ASC
    `);
    const allDates = datesResult[0]?.values.map(r => r[0]) || [];

    const table = document.createElement("table");
    table.border = "1";
    table.cellPadding = "5";
    table.style.borderCollapse = "collapse";
    table.style.minWidth = "100%";
    table.style.overflowX = "auto";

    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    ["Họ và tên", "Số buổi", "Số tiền", ...allDates.map(formatDate)].forEach(title => {
      const th = document.createElement("th");
      th.textContent = title;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    for (let index = 0; index < students.length; index++) {
      const [student_id, student_name] = students[index];
      const row = document.createElement("tr");

      // ✅ Tô màu xen kẽ
      row.style.backgroundColor = index % 2 === 0 ? "#ffffff" : "#f0faff";

      // Họ và tên
      const tdName = document.createElement("td");
      tdName.textContent = student_name;
      row.appendChild(tdName);

      // Số buổi điểm danh
      const buoiRes = db.exec(`
        SELECT COUNT(*) FROM Attendance
        WHERE student_id = ${student_id} AND class_id = ${classId} AND status = 1
      `);
      const soBuoi = buoiRes[0]?.values[0][0] || 0;

      const tdBuoi = document.createElement("td");
      tdBuoi.textContent = soBuoi;
      tdBuoi.style.textAlign = "center";
      row.appendChild(tdBuoi);

      // Số tiền = số buổi x học phí
      const hocphiRes = db.exec(`
        SELECT class_hocphi FROM Classes WHERE class_id = ${classId}
      `);
      const hocphi = hocphiRes[0]?.values[0][0] || 0;
      const soTien = soBuoi * hocphi;

      const tdTien = document.createElement("td");
      tdTien.textContent = soTien.toLocaleString() + " đ";
      tdTien.style.textAlign = "center";
      row.appendChild(tdTien);

      // Cột các ngày điểm danh
      for (const date of allDates) {
        const ddRes = db.exec(`
          SELECT 1 FROM Attendance
          WHERE student_id = ${student_id} AND class_id = ${classId}
          AND attendance_date = '${date}' AND status = 1
        `);
        const td = document.createElement("td");
        td.style.textAlign = "center";

        if (ddRes.length > 0) {
          td.textContent = "🟢";
        } else {
          td.textContent = "❌";
          td.style.color = "red";
        }

        row.appendChild(td);
      }

      tbody.appendChild(row);
    }

    table.appendChild(tbody);
    container.innerHTML = "";
    container.appendChild(table);
  } catch (err) {
    container.innerHTML = "<p style='color:red'>Lỗi hiển thị dữ liệu: " + err.message + "</p>";
  }
}

// ✅ Hàm xử lý mở menu (cho mobile)
document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("menuToggle");
  const menuBar = document.querySelector(".menu-bar");

  if (toggleBtn && menuBar) {
    toggleBtn.addEventListener("click", () => {
      menuBar.classList.toggle("open");
    });
  }
});

// ✅ Hàm mở/đóng submenu (cho iPhone)
function toggleSubmenu(el) {
  const li = el.parentElement;
  const openMenus = document.querySelectorAll(".has-submenu.open");

  openMenus.forEach(menu => {
    if (menu !== li) menu.classList.remove("open");
  });

  li.classList.toggle("open");
}
