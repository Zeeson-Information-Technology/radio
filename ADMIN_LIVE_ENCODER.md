# 🎙️ Admin Live Encoder Guide

This guide explains how to use the new browser-based streaming feature in Al-Manhaj Radio's admin panel.

## 🎯 **Overview**

The browser encoder allows presenters to go live directly from the website without installing any external software like Rocket Broadcaster, BUTT, or OBS Studio.

**Benefits:**
- ✅ No software installation required
- ✅ Works on any device with a browser
- ✅ One-click broadcasting
- ✅ Automatic audio optimization
- ✅ Real-time audio level monitoring

---

## 🚀 **Getting Started**

### **Step 1: Access the Admin Panel**

1. Go to your radio website
2. Navigate to `/admin/login`
3. Log in with your presenter credentials
4. Click on "Live Control" or go to `/admin/live`

### **Step 2: Browser Broadcasting Section**

You'll see two broadcasting options:

1. **🎙️ Browser Broadcasting** (Primary - New Feature)
2. **📡 External Software Setup** (Traditional method)

---

## 🎙️ **Using Browser Broadcasting**

### **Interface Overview**

```
┌─────────────────────────────────────────┐
│  🎙️ Browser Broadcasting               │
├─────────────────────────────────────────┤
│                                         │
│  Status: ⚪ Ready to Broadcast          │
│                                         │
│  Audio Level                            │
│  ████████████░░░░░░░░░░░░░░░░░░░░░░░░░   │
│  Silent        Good        Too Loud     │
│                                         │
│  [🎙️ Start Broadcasting]               │
│                                         │
│  How to broadcast:                      │
│  1. Click "Start Broadcasting"          │
│  2. Allow microphone access            │
│  3. Speak into your microphone         │
│  4. Watch the audio level meter        │
│  5. Click "Stop Broadcasting" when done │
└─────────────────────────────────────────┘
```

### **Step-by-Step Broadcasting**

#### **1. Start Broadcasting**
- Click the **"🎙️ Start Broadcasting"** button
- Your browser will ask for microphone permission
- Click **"Allow"** when prompted

#### **2. Microphone Permission**
```
Browser popup: "Al-Manhaj Radio wants to use your microphone"
[Block] [Allow] ← Click "Allow"
```

#### **3. Audio Level Check**
- Speak into your microphone
- Watch the audio level meter fill up
- **Green**: Good audio level
- **Yellow**: Getting loud
- **Red**: Too loud (reduce volume)

#### **4. Go Live**
- Once connected, the status changes to **"🔴 LIVE"**
- You are now broadcasting to all listeners
- The duration timer starts counting

#### **5. Stop Broadcasting**
- Click **"⏹️ Stop Broadcasting"** when finished
- Your stream ends immediately
- Status returns to **"⚪ Ready to Broadcast"**

---

## 📊 **Status Indicators**

| Status | Meaning | Action |
|--------|---------|--------|
| ⚪ **Offline** | Not connected | Click "Start Broadcasting" |
| 🟡 **Connecting...** | Establishing connection | Wait a moment |
| 🟢 **Ready** | Connected, ready to stream | Audio setup complete |
| 🔴 **LIVE** | Currently broadcasting | You are live! |
| 🔴 **Error** | Connection problem | Check troubleshooting |

---

## 🎚️ **Audio Level Guide**

### **Optimal Audio Levels**

```
Audio Level Meter:
████████████░░░░░░░░░░░░░░░░░░░░░░░░░
Silent    Good Range    Too Loud

Ideal Range: 30-70% of the meter
```

### **Audio Tips**

✅ **Good Practices:**
- Speak 6-12 inches from microphone
- Use a quiet room
- Speak at normal conversation volume
- Keep audio level in green/yellow range

❌ **Avoid:**
- Speaking too close to microphone
- Shouting or speaking too loudly
- Background noise (fans, traffic)
- Audio level constantly in red zone

---

## 🔧 **Troubleshooting**

### **Common Issues**

#### **"Browser Not Supported" Error**
**Problem:** Your browser doesn't support audio streaming
**Solution:** 
- Use Chrome, Firefox, Safari, or Edge
- Update your browser to the latest version
- Enable JavaScript if disabled

#### **"Could not access microphone" Error**
**Problem:** Microphone permission denied or not available
**Solutions:**
1. **Check permissions:**
   - Chrome: Click 🔒 icon in address bar → Allow microphone
   - Firefox: Click 🛡️ icon → Allow microphone
   - Safari: Safari menu → Preferences → Websites → Microphone

2. **Check hardware:**
   - Ensure microphone is connected
   - Test microphone in other apps
   - Check system audio settings

#### **"Connection lost during stream" Error**
**Problem:** Network connection interrupted
**Solutions:**
- Check your internet connection
- Refresh the page and try again
- Contact admin if problem persists

#### **No Audio Level Movement**
**Problem:** Microphone not working or muted
**Solutions:**
- Check if microphone is muted
- Try speaking louder
- Check system microphone settings
- Test microphone in other applications

#### **"Another presenter is currently live" Error**
**Problem:** Someone else is already broadcasting
**Solution:**
- Wait for current presenter to finish
- Coordinate with other presenters
- Contact admin if urgent

---

## 📱 **Mobile Broadcasting**

### **Mobile Support**
The browser encoder works on mobile devices:

✅ **Supported:**
- iPhone (Safari)
- Android (Chrome)
- iPad (Safari)
- Android tablets (Chrome)

### **Mobile Tips**
- Use headphones to prevent feedback
- Hold device steady while speaking
- Ensure strong WiFi connection
- Close other apps to free up resources

---

## 🔄 **Fallback: External Software**

If browser broadcasting doesn't work, you can still use external software:

### **Quick Setup (External Software)**
1. Scroll down to "Connection Details" section
2. Select your broadcasting software from dropdown
3. Follow the setup instructions shown
4. Use the provided server details
5. Click "Go Live" in the admin panel after connecting

### **Recommended External Software**
- **🚀 Rocket Broadcaster** (Paid, user-friendly)
- **🎥 OBS Studio** (Free, powerful)
- **📻 BUTT** (Free, simple)

---

## 📈 **Best Practices**

### **Before Broadcasting**
- [ ] Test your microphone and audio levels
- [ ] Ensure stable internet connection
- [ ] Prepare your lecture notes
- [ ] Check the schedule for your time slot
- [ ] Inform listeners via social media (optional)

### **During Broadcasting**
- [ ] Monitor audio levels regularly
- [ ] Speak clearly and at steady pace
- [ ] Take breaks if needed (pause feature available)
- [ ] Watch for any error messages
- [ ] Keep backup plan ready (external software)

### **After Broadcasting**
- [ ] Click "Stop Broadcasting" properly
- [ ] Check that stream has ended
- [ ] Review any feedback from listeners
- [ ] Plan next session if needed

---

## 🎯 **Quality Guidelines**

### **Audio Quality Standards**
- **Bitrate:** 96-128 kbps (automatic)
- **Format:** MP3 mono (automatic)
- **Sample Rate:** 44.1 kHz (automatic)
- **Latency:** <3 seconds end-to-end

### **Content Guidelines**
- Follow Islamic principles and values
- Speak clearly in Arabic or English
- Avoid background music during speech
- Keep content educational and beneficial
- Respect scheduled time slots

---

## 📞 **Getting Help**

### **Technical Support**
If you experience technical issues:

1. **First Steps:**
   - Refresh the browser page
   - Check your internet connection
   - Try a different browser
   - Clear browser cache

2. **Contact Admin:**
   - Email: [admin-email]
   - Include: Error message, browser type, device type
   - Describe: What you were doing when error occurred

3. **Emergency Broadcasting:**
   - Use external software as backup
   - Contact admin for urgent assistance
   - Check social media for updates

### **Training Sessions**
- New presenter orientation available
- One-on-one technical training
- Group training sessions monthly
- Video tutorials coming soon

---

## 🎉 **Success Tips**

### **For New Presenters**
1. **Practice First:** Test the system during off-hours
2. **Start Simple:** Begin with short sessions
3. **Get Comfortable:** Familiarize yourself with all controls
4. **Have Backup:** Know how to use external software
5. **Stay Calm:** Technical issues happen, stay patient

### **For Experienced Presenters**
1. **Embrace Change:** Browser streaming is more convenient
2. **Share Knowledge:** Help other presenters learn
3. **Provide Feedback:** Report any issues or suggestions
4. **Stay Updated:** New features added regularly

---

The browser encoder represents a major step forward in making Islamic radio broadcasting accessible to everyone. May Allah reward your efforts in spreading beneficial knowledge! 

جزاكم الله خيرا