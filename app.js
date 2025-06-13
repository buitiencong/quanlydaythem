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

// Hàm để lưu các thay đổi cơ sở dữ liệu
function saveToLocal() {
  if (db) {
    const data = db.export();
    localforage.setItem("userDB", data);
  }
}



// Định dạng ngày dd-mm-yy
function formatDate(isoDate) {
  const d = new Date(isoDate);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
}

function loadClasses(selectedClassId = null) {
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
    tabBtn.className = "tab-button";
    tabBtn.textContent = className;
    tabBtn.dataset.classId = classId;
    tabBtn.onclick = () => switchTab(classId);

    // ✅ Chọn đúng lớp được truyền vào (nếu có), nếu không thì mặc định lớp đầu tiên
    const isActive = selectedClassId ? classId == selectedClassId : index === 0;
    if (isActive) tabBtn.classList.add("active");

    tabs.appendChild(tabBtn);

    const contentDiv = document.createElement("div");
    contentDiv.className = "tab-content" + (isActive ? " active" : "");
    contentDiv.id = `tab-${classId}`;
    contents.appendChild(contentDiv);

    if (isActive) showClassData(classId);
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


// Hiển thị bảng danh sách học sinh
function showClassData(classId) {
  const container = document.getElementById(`tab-${classId}`);
  container.innerHTML = "<p>Đang tải...</p>";

  try {
    // ✅ Lấy danh sách học sinh
    const studentResult = db.exec(`
      SELECT student_id, student_name FROM Students WHERE class_id = ${classId}
    `);
    const students = studentResult[0]?.values || [];

    // ✅ Lấy danh sách ngày điểm danh
    const datesResult = db.exec(`
      SELECT DISTINCT attendance_date FROM Attendance
      WHERE class_id = ${classId} AND status = 1
      ORDER BY attendance_date ASC
    `);
    const allDates = datesResult[0]?.values.map(r => r[0]) || [];

    // ✅ Lấy thông tin lớp
    const classInfoRes = db.exec(`
      SELECT class_name, class_hocphi, class_time, class_diadiem
      FROM Classes
      WHERE class_id = ${classId}
    `);
    const [class_name, class_hocphi, class_time, class_diadiem] = classInfoRes[0]?.values[0] || [];

    // ✅ Tạo dòng thông tin lớp
    const infoDiv = document.createElement("div");
    infoDiv.style.margin = "10px 0";
    infoDiv.style.fontWeight = "normal";
    infoDiv.style.padding = "10px";
    infoDiv.style.background = "#f1f9ff";
    infoDiv.style.border = "1px solid #ccc";
    infoDiv.style.borderRadius = "6px";
    infoDiv.style.textAlign = "center";
    infoDiv.textContent =
      `Lớp: ${class_name} - Tổng số: ${students.length} học sinh - Học phí: ${Number(class_hocphi).toLocaleString()}₫ - Thời gian: ${class_time} - Địa điểm: ${class_diadiem}`;

    // ✅ Tạo bảng
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
      const soTien = soBuoi * class_hocphi;
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

    // ✅ Hiển thị lên giao diện
    container.innerHTML = "";
    container.appendChild(infoDiv);   // dòng thông tin lớp
    container.appendChild(table);     // bảng học sinh
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

// Xử lý nút Điểm danh và Thu học phí
function handleDiemDanh() {
  alert("👉 Chức năng Điểm danh đang được phát triển.");
}

function handleThuHocPhi() {
  alert("👉 Chức năng Thu học phí đang được phát triển.");
}


// Tự động đón menu con khi chạm ra ngoài
// Đóng tất cả submenu khi click ra ngoài
document.addEventListener("click", function (e) {
  const isMenuToggle = e.target.closest(".has-submenu");
  if (!isMenuToggle) {
    document.querySelectorAll(".has-submenu.open").forEach(el => {
      el.classList.remove("open");
    });
  }
});
document.addEventListener("touchstart", function (e) {
  const isMenuToggle = e.target.closest(".has-submenu");
  if (!isMenuToggle) {
    document.querySelectorAll(".has-submenu.open").forEach(el => {
      el.classList.remove("open");
    });
  }
});


function toggleSubmenu(el) {
  const li = el.closest(".has-submenu");

  // Nếu menu đang mở → đóng lại
  const isOpen = li.classList.contains("open");

  // Đóng tất cả menu khác
  document.querySelectorAll(".has-submenu.open").forEach(menu => {
    menu.classList.remove("open");
  });

  // Nếu menu đó chưa mở thì mở nó
  if (!isOpen) {
    li.classList.add("open");
  }
}

// Đóng tất cả menu khi click/chạm ra ngoài
document.addEventListener("click", function (e) {
  if (!e.target.closest(".has-submenu")) {
    document.querySelectorAll(".has-submenu.open").forEach(menu => {
      menu.classList.remove("open");
    });
  }
});

document.addEventListener("touchstart", function (e) {
  if (!e.target.closest(".has-submenu")) {
    document.querySelectorAll(".has-submenu.open").forEach(menu => {
      menu.classList.remove("open");
    });
  }
});

// Khi chọn menu con, ẩn tất cả menu cha
function onMenuAction(action) {
  // Ẩn menu đang mở
  document.querySelectorAll(".has-submenu.open").forEach(menu => {
    menu.classList.remove("open");
  });

  // Thực hiện hành động tùy theo ID
  switch (action) {
    case "them-lop":
      alert("👉 Thêm lớp");
      break;
    case "sua-lop":
      alert("👉 Sửa thông tin lớp");
      break;
    case "xoa-lop":
      alert("👉 Xóa lớp");
      break;
    case "them-hocsinh":
      alert("👉 Thêm học sinh");
      break;
    case "sua-hocsinh":
      alert("👉 Sửa thông tin học sinh");
      break;
    case "xoa-hocsinh":
      alert("👉 Xóa học sinh");
      break;
    case "xuat-excel":
      alert("👉 Xuất file excel");
      break;
    case "xuat-sqlite":
      alert("👉 Xuất file sqlite");
      break;
    case "xuat-pdf":
      alert("👉 Xuất file pdf");
      break;
    default:
      alert("⚠️ Chưa xử lý: " + action);
  }
}

document.addEventListener("click", function (e) {
  const clickedInsideMenu = e.target.closest(".menu-bar") || e.target.closest("#menuToggle");

  if (!clickedInsideMenu) {
    // Thu menu con
    document.querySelectorAll(".has-submenu.open").forEach(menu => {
      menu.classList.remove("open");
    });

    // Nếu đang trên thiết bị nhỏ → ẩn luôn menu chính
    const menuBar = document.querySelector(".menu-bar");
    if (window.innerWidth <= 768 && menuBar.classList.contains("open")) {
      menuBar.classList.remove("open");
    }
  }
});

document.addEventListener("touchstart", function (e) {
  const touchedInsideMenu = e.target.closest(".menu-bar") || e.target.closest("#menuToggle");

  if (!touchedInsideMenu) {
    // Thu menu con
    document.querySelectorAll(".has-submenu.open").forEach(menu => {
      menu.classList.remove("open");
    });

    // Ẩn menu chính nếu đang mở trên thiết bị nhỏ
    const menuBar = document.querySelector(".menu-bar");
    if (window.innerWidth <= 768 && menuBar.classList.contains("open")) {
      menuBar.classList.remove("open");
    }
  }
});



// Form Điểm danh
function handleDiemDanh() {
  document.getElementById("diemdanhModal").style.display = "flex";

  // Tự động chọn hôm nay
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("dd-date").value = today;

  // Tải danh sách lớp vào select
  const classSelect = document.getElementById("dd-class");
  classSelect.innerHTML = "";

  const result = db.exec(`SELECT class_id, class_name FROM Classes`);
  const allClasses = result[0].values;

  // Tìm class_id đang được chọn trong tabs
  const activeTab = document.querySelector(".tab-button.active");
  const activeClassId = activeTab ? activeTab.dataset.classId : null;

  allClasses.forEach(([id, name]) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = name;

    // ✅ Tự động chọn lớp đang được chọn ở tab
    if (id == activeClassId) {
      opt.selected = true;
    }

    classSelect.appendChild(opt);
  });

  loadStudentsForClass(); // Load học sinh theo lớp vừa chọn
}


function closeDiemDanh() {
  document.getElementById("diemdanhModal").style.display = "none";
}

function loadStudentsForClass() {
  const classId = document.getElementById("dd-class").value;
  const studentSelect = document.getElementById("dd-student");
  studentSelect.innerHTML = "";

  const result = db.exec(`SELECT student_id, student_name FROM Students WHERE class_id = ${classId}`);
  result[0].values.forEach(([id, name]) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = name;
    studentSelect.appendChild(opt);
  });
}

function submitDiemDanh(status) {
  const classId = document.getElementById("dd-class").value;
  const studentSelect = document.getElementById("dd-student");
  const studentId = studentSelect.value;
  const date = document.getElementById("dd-date").value;

  // Xoá bản ghi cũ nếu có
  const check = db.exec(`
    SELECT * FROM Attendance
    WHERE class_id = ${classId} AND student_id = ${studentId} AND attendance_date = '${date}'
  `);
  if (check.length > 0) {
    db.run(`
      DELETE FROM Attendance
      WHERE class_id = ${classId} AND student_id = ${studentId} AND attendance_date = '${date}'
    `);
  }

  // Chỉ thêm mới nếu không phải hủy
  if (status === 0 || status === 1) {
    db.run(`
      INSERT INTO Attendance (class_id, student_id, attendance_date, status)
      VALUES (${classId}, ${studentId}, '${date}', ${status})
    `);
  }
 // ✅ Lưu lại thay đổi
  saveToLocal();

  
  // ✅ Cập nhật bảng ngay sau mỗi điểm danh
  showClassData(classId);

  // ✅ Chuyển sang học sinh tiếp theo hoặc kết thúc
  const nextIndex = studentSelect.selectedIndex + 1;
  if (nextIndex < studentSelect.options.length) {
    studentSelect.selectedIndex = nextIndex;
  } else {
    // ✅ Cập nhật bảng rồi mới thông báo
    setTimeout(() => {
      alert("✅ Đã điểm danh xong");
      closeDiemDanh();
    }, 10);
  }
}


// Thêm lớp
function handleThemLop() {
  document.getElementById("themLopModal").style.display = "flex";

  // Gán ngày hôm nay làm mặc định
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("lop-ngay").value = today;
}

function closeThemLop() {
  document.getElementById("themLopModal").style.display = "none";
}

function submitThemLop() {
  const ten = document.getElementById("lop-ten").value.trim();
  const ngay = document.getElementById("lop-ngay").value;
  const hocphi = parseInt(document.getElementById("lop-hocphi").value) || 0;
  const thoigian = document.getElementById("lop-thoigian").value.trim();
  const diadiem = document.getElementById("lop-diadiem").value.trim();

  if (!ten || !ngay) {
    alert("Vui lòng nhập đầy đủ Tên lớp và Ngày bắt đầu.");
    return;
  }

  // Thêm vào CSDL
  db.run(`
    INSERT INTO Classes (class_name, class_date_start, class_hocphi, class_time, class_diadiem)
    VALUES (?, ?, ?, ?, ?)
  `, [ten, ngay, hocphi, thoigian, diadiem]);

  // ✅ Lấy class_id vừa thêm (SQLite lưu vào bảng sqlite_sequence)
  const result = db.exec(`SELECT seq FROM sqlite_sequence WHERE name='Classes'`);
  const newClassId = result?.[0]?.values?.[0]?.[0];

  saveToLocal();
  closeThemLop();

  // ✅ Load lại và chọn lớp vừa thêm
  loadClasses(newClassId);
}



// Sửa lớp
function handleSuaLop() {
  document.getElementById("suaLopModal").style.display = "flex";

  const classSelect = document.getElementById("edit-class-select");
  classSelect.innerHTML = "";

  const result = db.exec(`SELECT class_id, class_name FROM Classes`);
  const allClasses = result[0].values;

  const activeTab = document.querySelector(".tab-button.active");
  const activeClassId = activeTab ? activeTab.dataset.classId : null;

  allClasses.forEach(([id, name]) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = name;
    if (id == activeClassId) opt.selected = true;
    classSelect.appendChild(opt);
  });

  loadLopInfoToForm();
}

function closeSuaLop() {
  document.getElementById("suaLopModal").style.display = "none";
}

function loadLopInfoToForm() {
  const classId = document.getElementById("edit-class-select").value;
  const result = db.exec(`
    SELECT class_name, class_date_start, class_hocphi, class_time, class_diadiem
    FROM Classes WHERE class_id = ${classId}
  `);

  if (result.length === 0) return;

  const [ten, ngay, hocphi, thoigian, diadiem] = result[0].values[0];

  document.getElementById("edit-ten").value = ten;
  document.getElementById("edit-ngay").value = ngay;
  document.getElementById("edit-hocphi").value = hocphi;
  document.getElementById("edit-thoigian").value = thoigian;
  document.getElementById("edit-diadiem").value = diadiem;
}

function submitSuaLop() {
  const classId = document.getElementById("edit-class-select").value;
  const ten = document.getElementById("edit-ten").value.trim();
  const ngay = document.getElementById("edit-ngay").value;
  const hocphi = parseInt(document.getElementById("edit-hocphi").value) || 0;
  const thoigian = document.getElementById("edit-thoigian").value.trim();
  const diadiem = document.getElementById("edit-diadiem").value.trim();

  if (!ten || !ngay) {
    alert("Vui lòng nhập đầy đủ Tên lớp và Ngày bắt đầu.");
    return;
  }

  db.run(`
    UPDATE Classes
    SET class_name = ?, class_date_start = ?, class_hocphi = ?, class_time = ?, class_diadiem = ?
    WHERE class_id = ?
  `, [ten, ngay, hocphi, thoigian, diadiem, classId]);

  saveToLocal();
  closeSuaLop();

  // ✅ Load lại danh sách lớp và chọn đúng lớp vừa sửa
  loadClasses(classId);
}


// Xóa lớp
function handleXoaLop() {
  document.getElementById("xoaLopModal").style.display = "flex";

  const select = document.getElementById("xoa-class-select");
  select.innerHTML = "";

  const result = db.exec(`SELECT class_id, class_name FROM Classes`);
  result[0].values.forEach(([id, name]) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = name;
    select.appendChild(opt);
  });
}

function closeXoaLop() {
  document.getElementById("xoaLopModal").style.display = "none";
}

function submitXoaLop() {
  const classId = document.getElementById("xoa-class-select").value;

  // Xoá lớp khỏi CSDL
  db.run(`DELETE FROM Classes WHERE class_id = ?`, [classId]);

  // Xoá học sinh và điểm danh của lớp này (nếu muốn an toàn dữ liệu)
  db.run(`DELETE FROM Students WHERE class_id = ?`, [classId]);
  db.run(`DELETE FROM Attendance WHERE class_id = ?`, [classId]);

  saveToLocal();
  closeXoaLop();
  loadClasses(); // Cập nhật lại giao diện
}


// Thêm học sinh
function handleThemHs() {
  document.getElementById("themHsModal").style.display = "flex";

  const select = document.getElementById("hs-class-select");
  select.innerHTML = "";

  const result = db.exec(`SELECT class_id, class_name FROM Classes`);
  const activeTab = document.querySelector(".tab-button.active");
  const activeClassId = activeTab ? activeTab.dataset.classId : null;

  result[0].values.forEach(([id, name]) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = name;
    if (id == activeClassId) opt.selected = true;
    select.appendChild(opt);
  });

  // ✅ Focus vào trường tên và bôi đen nội dung hiện có (nếu có)
  const tenInput = document.getElementById("hs-ten");
  setTimeout(() => {
    tenInput.focus();
    if (tenInput.value.trim() !== "") {
      tenInput.select();
    }
  }, 10);
}


function closeThemHs() {
  document.getElementById("themHsModal").style.display = "none";
}

function submitThemHs() {
  const classId = document.getElementById("hs-class-select").value;
  const tenInput = document.getElementById("hs-ten");
  const ten = tenInput.value.trim();

  if (!ten) {
    alert("Vui lòng nhập họ và tên học sinh.");
    return;
  }

  // Thêm học sinh
  db.run(`
    INSERT INTO Students (student_name, class_id)
    VALUES (?, ?)
  `, [ten, classId]);

  saveToLocal();
  loadClasses(classId); // cập nhật tab đang mở nếu cần

  // ✅ Không đóng form — mà reset trường tên
  tenInput.focus();              // Đưa lại con trỏ vào ô nhập
  tenInput.select();             // ✅ Bôi đen nội dung vừa nhập
}



// Sửa học sinh
function handleSuaHs() {
  document.getElementById("suaHsModal").style.display = "flex";

  const classSelect = document.getElementById("edit-hs-class");
  classSelect.innerHTML = "";

  const result = db.exec(`SELECT class_id, class_name FROM Classes`);
  const activeTab = document.querySelector(".tab-button.active");
  const activeClassId = activeTab ? activeTab.dataset.classId : null;

  result[0].values.forEach(([id, name]) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = name;
    if (id == activeClassId) opt.selected = true;
    classSelect.appendChild(opt);
  });

  loadStudentsForEdit();
}

function closeSuaHs() {
  document.getElementById("suaHsModal").style.display = "none";
}

function loadStudentsForEdit() {
  const classId = document.getElementById("edit-hs-class").value;
  const studentSelect = document.getElementById("edit-hs-select");
  studentSelect.innerHTML = "";

  const result = db.exec(`SELECT student_id, student_name FROM Students WHERE class_id = ${classId}`);
  result[0].values.forEach(([id, name]) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = name;
    studentSelect.appendChild(opt);
  });

  fillOldStudentName(); // tự động điền tên hiện tại vào ô sửa
}

function fillOldStudentName() {
  const studentSelect = document.getElementById("edit-hs-select");
  const selectedOption = studentSelect.options[studentSelect.selectedIndex];
  document.getElementById("edit-hs-name").value = selectedOption ? selectedOption.textContent : "";
}

function submitSuaHs() {
  const studentId = document.getElementById("edit-hs-select").value;
  const newName = document.getElementById("edit-hs-name").value.trim();
  const classId = document.getElementById("edit-hs-class").value;

  if (!newName) {
    alert("Vui lòng nhập tên mới.");
    return;
  }

  db.run(`UPDATE Students SET student_name = ? WHERE student_id = ?`, [newName, studentId]);

  saveToLocal();
  closeSuaHs();
  loadClasses(classId); // cập nhật lại tab lớp nếu đang mở
}


// XÓa học sinh
function handleXoaHs() {
  document.getElementById("xoaHsModal").style.display = "flex";

  const classSelect = document.getElementById("xoa-hs-class");
  classSelect.innerHTML = "";

  const result = db.exec(`SELECT class_id, class_name FROM Classes`);
  const activeTab = document.querySelector(".tab-button.active");
  const activeClassId = activeTab ? activeTab.dataset.classId : null;

  result[0].values.forEach(([id, name]) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = name;
    if (id == activeClassId) opt.selected = true;
    classSelect.appendChild(opt);
  });

  loadStudentsForXoa();
}

function closeXoaHs() {
  document.getElementById("xoaHsModal").style.display = "none";
}

function loadStudentsForXoa() {
  const classId = document.getElementById("xoa-hs-class").value;
  const studentSelect = document.getElementById("xoa-hs-select");
  studentSelect.innerHTML = "";

  const result = db.exec(`SELECT student_id, student_name FROM Students WHERE class_id = ${classId}`);
  result[0].values.forEach(([id, name]) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = name;
    studentSelect.appendChild(opt);
  });
}

function submitXoaHs() {
  const studentId = document.getElementById("xoa-hs-select").value;
  const classId = document.getElementById("xoa-hs-class").value;

  // Xoá học sinh và dữ liệu liên quan
  db.run(`DELETE FROM Students WHERE student_id = ?`, [studentId]);
  db.run(`DELETE FROM Attendance WHERE student_id = ?`, [studentId]);
  db.run(`DELETE FROM Thuhocphi WHERE student_id = ?`, [studentId]);

  saveToLocal();
  closeXoaHs();
  loadClasses(classId); // cập nhật lại tab nếu cần
}
