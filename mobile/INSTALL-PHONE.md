# KaamWala AI — Phone par install kaise karein

Agar APK "Installing..." par atak jaye ya "App not installed" aaye, yeh steps follow karein.

## Zaroori steps (order mein)

### 1. Purani app hata dein
- **Settings → Apps** (ya Application Manager)
- Dhoondein: **mobile**, **KaamWala**, ya **KaamWala AI**
- **Uninstall** karein (sirf "Force stop" kaafi nahi)

### 2. Sahi APK file use karein
- File ka naam: **`KaamWala-AI-v1.0.1.apk`**
- Location PC par: `mobile\KaamWala-AI-v1.0.1.apk`
- Size lagbhag **35–50 MB** honi chahiye (purani 80MB wali file mat use karein)

### 3. WhatsApp se mat bhejein
- 80MB+ files WhatsApp corrupt kar deta hai → install fail
- **USB cable**, **Google Drive**, ya **USB flash** se copy karein

### 4. Phone par install
- **Files** app se APK kholein
- **Install unknown apps** allow karein jab phone pooche
- Install complete hone tak wait karein (1–2 minute)

### 5. Agar phir bhi na ho
- Phone **restart** karein
- **Storage** check karein: kam az kam **500 MB** khali ho
- PC se (agar USB debugging on ho):

```powershell
adb uninstall com.anonymous.mobile
adb install "d:\Faiz\hackhthon\kaamwala-ai\mobile\KaamWala-AI-v1.0.1.apk"
```

## 32-bit purane phone (bahut rare)
Agar sirf arm64 build na chale, developer se `armeabi-v7a` wali build mangen.
