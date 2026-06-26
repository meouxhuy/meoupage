document.addEventListener('DOMContentLoaded', async () => {
  const loginCard = document.getElementById('loginCard');
  const dashboardCard = document.getElementById('dashboardCard');
  const loginForm = document.getElementById('loginForm');
  const errorMsg = document.getElementById('errorMsg');
  const copyBtn = document.getElementById('copyBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  let usersData = {};
  let usersIndex = {};

  // 1. Fetch và parse file env.txt
  try {
    const response = await fetch('env.txt');
    if (!response.ok) {
      throw new Error("Không thể tải file env.txt (Hãy chắc chắn bạn đang chạy qua Local Server như Live Server)");
    }
    const envText = await response.text();
    
    // Parse .env
    const lines = envText.split('\n');
    let tempEnv = {};
    
    lines.forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const splitIdx = line.indexOf('=');
        if (splitIdx > 0) {
          const key = line.substring(0, splitIdx).trim();
          let value = line.substring(splitIdx + 1).trim();
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.substring(1, value.length - 1);
          }
          tempEnv[key] = value;
        }
      }
    });

    // Build user dict from env
    for (const [key, value] of Object.entries(tempEnv)) {
      if (key.startsWith('USER_EMAIL_')) {
        const indexStr = key.replace('USER_EMAIL_', '');
        const index = parseInt(indexStr);
        const passKey = `USER_PASS_${index}`;
        
        if (tempEnv[passKey]) {
          usersData[value] = tempEnv[passKey];
          usersIndex[value] = index;
        }
      }
    }
    
  } catch (err) {
    console.error(err);
    showError("Lỗi đọc dữ liệu: " + err.message);
  }

  // 2. Kiểm tra trạng thái đăng nhập
  const loggedInEmail = localStorage.getItem('meou_user_email');
  if (loggedInEmail && usersData[loggedInEmail]) {
    showDashboard(loggedInEmail);
  }

  // 3. Xử lý Đăng Nhập
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('emailInput').value.trim();
    const pass = document.getElementById('passwordInput').value.trim();
    
    errorMsg.style.display = 'none';

    if (usersData[email] && pass === '123456') {
      localStorage.setItem('meou_user_email', email);
      localStorage.setItem('meou_login_time', getFormattedTime());
      showDashboard(email);
    } else {
      showError("Email hoặc mật khẩu không đúng!");
    }
  });

  // 4. Xử lý Đăng Xuất
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('meou_user_email');
    localStorage.removeItem('meou_login_time');
    document.getElementById('emailInput').value = '';
    document.getElementById('passwordInput').value = '';
    dashboardCard.style.display = 'none';
    loginCard.style.display = 'block';
  });

  function getFormattedTime() {
    const d = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear().toString().slice(2)}`;
  }

  function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.style.display = 'block';
  }

  function showDashboard(email) {
    loginCard.style.display = 'none';
    dashboardCard.style.display = 'block';
    
    const index = usersIndex[email];
    let serverName = "";
    let serverUrl = "";
    
    // Logic chia server
    if (index === 1 || index === 21) {
      serverName = "Server Admin";
      serverUrl = "https://meou-scan-admin.onrender.com/";
    } else if (index >= 2 && index <= 20) {
      const serverNum = Math.ceil((index - 1) / 2);
      serverName = `Server ${serverNum}`;
      serverUrl = `https://meou-scan-sv${serverNum}.onrender.com/`;
    } else {
      serverName = "Server Khách";
      serverUrl = "https://meou-scan-public.onrender.com/";
    }

    // Hiển thị UI
    let username = email.split('@')[0];
    if (username.endsWith('.sc')) {
      username = username.slice(0, -3);
    }
    
    document.getElementById('userNameDisplay').textContent = username;
    document.getElementById('userNameDisplay').className = "username-gradient";
    document.getElementById('serverNameDisplay').textContent = serverName;
    
    const linkEl = document.getElementById('serverLinkDisplay');
    linkEl.textContent = serverUrl;
    linkEl.href = serverUrl;

    // Hiển thị thông tin đăng nhập Server
    document.getElementById('serverAccEmail').textContent = email;
    const realPass = usersData[email];
    document.getElementById('serverAccPass').textContent = realPass;

    // Hàm tiện ích copy
    function setupCopy(btnId, textToCopy) {
      const btn = document.getElementById(btnId);
      btn.onclick = () => {
        navigator.clipboard.writeText(textToCopy).then(() => {
          btn.style.color = "#10b981"; // Đổi màu xanh ngọc
          setTimeout(() => { btn.style.color = "#a78bfa"; }, 2000);
        });
      };
    }

    setupCopy('copyAccBtn', email);
    setupCopy('copyPassBtn', realPass);

    // Xử lý nút Copy Link Server
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(serverUrl).then(() => {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = "Đã Copy!";
        copyBtn.style.background = "linear-gradient(135deg, #10b981 0%, #34d399 100%)";
        setTimeout(() => {
          copyBtn.textContent = originalText;
          copyBtn.style.background = "";
        }, 2000);
      }).catch(err => {
        showError("Không thể copy: " + err);
      });
    };

    // Lấy IP và hiển thị thông tin Meta
    const metaInfo = document.getElementById('loginMetaInfo');
    const loginTime = localStorage.getItem('meou_login_time') || getFormattedTime();
    
    // Tạo device key ảo nhưng lưu cứng vào trình duyệt để hù người dùng
    let deviceKey = localStorage.getItem('meou_device_key');
    if (!deviceKey) {
      const gen = () => Math.random().toString(36).substring(2, 6).toUpperCase();
      deviceKey = `${gen()}-${gen()}-${gen()}-${gen()}`;
      localStorage.setItem('meou_device_key', deviceKey);
    }
    
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => {
        metaInfo.innerHTML = `IP: ${data.ip} - Time Login: ${loginTime}<br><span style="color: #cbd5e1; font-family: monospace;">Key Login: ${deviceKey}</span>`;
      })
      .catch(err => {
        metaInfo.innerHTML = `IP: Không xác định - Time Login: ${loginTime}<br><span style="color: #cbd5e1; font-family: monospace;">Key Login: ${deviceKey}</span>`;
      });
  }
});
