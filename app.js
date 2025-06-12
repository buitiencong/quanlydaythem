let db;
let SQL;

initSqlJs({
  locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.6.2/${file}`
}).then(SQLLib => {
  SQL = SQLLib;

  // Khi app khởi động, thử load DB từ IndexedDB trước
  localforage.getItem("userDB").then(buffer => {
    if (buffer) {
      db = new SQL.Database(new Uint8Array(buffer));
      loadClassesAndStudents();
    }
  });

  // Nghe sự kiện chọn file .db mới
  document.getElementById("dbfile").addEventListener("change", event => {
    const reader = new FileReader();
    reader.onload = function () {
      const uint8array = new Uint8Array(reader.result);
      db = new SQL.Database(uint8array);

      // ✅ Lưu vào IndexedDB
      localforage.setItem("userDB", uint8array).then(() => {
        console.log("Đã lưu .db vào IndexedDB");
      });

      loadClassesAndStudents();
    };
    reader.readAsArrayBuffer(event.target.files[0]);
  });
});

function loadClassesAndStudents() {
  const tabs = document.getElementById("tabs");
  const contents = document.getElementById("tabContents");
  tabs.innerHTML = "";
  contents.innerHTML = "";

  let classes;
  try {
    classes = db.exec("SELECT class_id, class_name FROM Classes");
  } catch (err) {
    tabs.innerHTML = "<p>Lỗi DB: " + err.message + "</p>";
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

    let studentResult;
    try {
      studentResult = db.exec(`SELECT student_name FROM Students WHERE class_id = ${classId}`);
    } catch (err) {
      contentDiv.innerHTML = "<p>Lỗi học sinh: " + err.message + "</p>";
      contents.appendChild(contentDiv);
      return;
    }

    if (studentResult.length > 0 && studentResult[0].values.length > 0) {
      const ul = document.createElement("ul");
      studentResult[0].values.forEach(([name]) => {
        const li = document.createElement("li");
        li.textContent = name;
        ul.appendChild(li);
      });
      contentDiv.appendChild(ul);
    } else {
      contentDiv.innerHTML = "<i>Không có học sinh.</i>";
    }

    contents.appendChild(contentDiv);
  });
}

function switchTab(classId) {
  document.querySelectorAll(".tab-button").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.classId == classId);
  });
  document.querySelectorAll(".tab-content").forEach(div => {
    div.classList.toggle("active", div.id === `tab-${classId}`);
  });
}
