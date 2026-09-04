<div align="center">

<!-- Animated Header Wave -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=timeGradient&height=200&section=header&text=Auto%20Video%20Generator&fontSize=60&fontAlignY=38&animation=fadeIn&fontColor=ffffff&desc=Fully%20Autonomous%20AI%20Video%20Pipeline&descAlignY=60&descSize=20" width="100%"/>

<br/><br/>

[![React](https://img.shields.io/badge/Frontend-React_Vite-61DAFB?style=for-the-badge&logo=react&logoColor=black)](#)
[![Node.js](https://img.shields.io/badge/Backend-Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](#)
[![Gemini](https://img.shields.io/badge/AI-Google_Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white)](#)
[![ElevenLabs](https://img.shields.io/badge/Voice-ElevenLabs-000000?style=for-the-badge&logo=elevenlabs&logoColor=white)](#)
[![Wan2.7](https://img.shields.io/badge/Video-Wan_2.7-FF5A5F?style=for-the-badge)](#)

> **Transform a single text prompt into a cinematic, fully narrated video in minutes.**  
> An enterprise-grade, multi-agent AI pipeline combining LLMs, Text-to-Speech, Image Generation, and Image-to-Video models.

</div>

<br/>

---

## 🏗️ System Architecture

Our robust pipeline is orchestrated through an asynchronous Node.js backend, ensuring fault tolerance, rate-limit handling, and high-quality generation at every node.

```mermaid
graph TD;
    %% Core Inputs
    Input([User Topic]) --> Scripting[Gemini 3.6 Flash: Script & Storyboard];
    
    %% Script to Assets
    Scripting --> Voice[ElevenLabs: High-Fidelity Voiceover];
    Scripting --> ImagePrompts[Gemini: Scene-Aware Prompt Engineering];
    
    %% Asset Generation
    ImagePrompts --> Images[Cloudflare Flux 1.0: Scene Images];
    Images --> Motion[DashScope Wan 2.7: Cinematic Image-to-Video];
    
    %% Assembly
    Motion --> Assembly[FFmpeg: Concat & Audio Sync];
    Voice --> Assembly;
    
    %% Final Output
    Assembly --> Output([Final MP4 Video Export]);

    %% Styling
    classDef ai fill:#2a004f,stroke:#7b2cbf,stroke-width:2px,color:#fff;
    classDef process fill:#003049,stroke:#0077b6,stroke-width:2px,color:#fff;
    
    class Scripting,Voice,ImagePrompts,Images,Motion ai;
    class Assembly process;
```

<br/>

---

## ✨ Enterprise Features

<table>
  <tr>
    <td width="50%">
      <h3>🧠 Autonomous Intelligence</h3>
      <p>The system independently breaks down topics into a structured master plan, assigning specific environments, character traits, and camera angles to each scene without human intervention.</p>
    </td>
    <td width="50%">
      <h3>🎞️ Cinematic Consistency</h3>
      <p>Through strict prompt engineering and state-machine tracking, the pipeline ensures visual, lighting, and thematic continuity across all generated frames.</p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>🛡️ Fault-Tolerant Engine</h3>
      <p>Features intelligent circuit breakers, async polling, and deterministic fallback generators to handle quota limits, network timeouts, and model halucinations gracefully.</p>
    </td>
    <td width="50%">
      <h3>⚡ High-Performance Assembly</h3>
      <p>Utilizes hardware-accelerated <code>FFmpeg</code> for frame-perfect concatenation, audio mapping, and multi-stream sync, bypassing heavy re-encoding where possible.</p>
    </td>
  </tr>
</table>

<br/>

---

## 📸 Showcase & Visuals

<div align="center">
  <table style="border: none;">
    <tr>
      <td style="border: none;"><img src="frontend/screenshots/1.jpeg" style="border-radius: 8px;" alt="Dashboard" width="400"/></td>
      <td style="border: none;"><img src="frontend/screenshots/2.jpg" style="border-radius: 8px;" alt="Scripting" width="400"/></td>
    </tr>
    <tr>
      <td style="border: none;"><img src="frontend/screenshots/3.jpg" style="border-radius: 8px;" alt="Image Generation" width="400"/></td>
      <td style="border: none;"><img src="frontend/screenshots/4.jpg" style="border-radius: 8px;" alt="Video Pipeline" width="400"/></td>
    </tr>
    <tr>
      <td style="border: none;"><img src="frontend/screenshots/5.jpg" style="border-radius: 8px;" alt="Video Pipeline" width="400"/></td>
      <td style="border: none;"><img src="frontend/screenshots/6.jpg" style="border-radius: 8px;" alt="Video Pipeline" width="400"/></td>
    </tr>
    <tr>
      <td style="border: none;"><img src="frontend/screenshots/7.jpg" style="border-radius: 8px;" alt="Video Pipeline" width="400"/></td>
      <td style="border: none;"><img src="frontend/screenshots/8.jpg" style="border-radius: 8px;" alt="Video Pipeline" width="400"/></td>
    </tr>
  </table>
</div>

<br/>

---

## Deployment & Installation

```bash
# 1. Clone the repository
git clone https://github.com/sohail-ahmed-26/auto-video-generator.git

# 2. Install Backend Dependencies
cd auto-video-generator/backend
npm install

# 3. Setup Environment Variables (.env)
GEMINI_API_KEY=your_gemini_key
ELEVENLABS_API_KEY=your_elevenlabs_key
CLOUDFLARE_API_TOKEN=your_cloudflare_token
WAN_API_KEY=your_dashscope_wan_key
VIDEO_PROVIDER=WAN

# 4. Boot the Microservices
npm run dev

# 5. Boot the Frontend Interface
cd ../frontend
npm install
npm run dev
```

<br/><br/><br/>

<div align="center">

## 👨‍💻 Meet The Architect

<!-- Animated Typing Info for Author -->
<a href="https://sohail.devsil.com">
  <img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&weight=600&size=24&pause=1000&color=00F0FF&center=true&vCenter=true&width=800&lines=Hi%2C+I'm+Sohail+Ahmed+👋;AI+Engineer+%26+Data+Scientist;Specializing+in+Agentic+AI%2C+LLMs%2C+%26+Automation;Building+intelligent+systems+for+real-world+impact!" alt="Sohail Ahmed" />
</a>

<br/><br/>

<a href="https://sohail.devsil.com">
  <img src="https://github.com/sohail-ahmed-26.png" width="160" height="160" style="border-radius: 50%; box-shadow: 0 0 20px rgba(0, 240, 255, 0.5); border: 4px solid #00F0FF;" alt="Sohail Ahmed">
</a>

<br/><br/>

### **Sohail Ahmed**
*Transforming raw data into automated business intelligence.*

<br/>

**🔗 Let's Connect:**

[![Portfolio](https://img.shields.io/badge/Portfolio-sohail.devsil.com-blue?style=for-the-badge&logo=google-chrome&logoColor=white)](https://sohail.devsil.com)
[![GitHub](https://img.shields.io/badge/GitHub-sohail--ahmed--26-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/sohail-ahmed-26)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Sohail_Ahmed-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/sohail-ahmed-devsil)
[![Kaggle](https://img.shields.io/badge/Kaggle-sohail2411126-20BEFF?style=for-the-badge&logo=kaggle&logoColor=white)](https://www.kaggle.com/sohail2411126)

<br/>

© 2026 Sohail Ahmed · All rights reserved.

<!-- Animated Footer Wave -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=timeGradient&height=180&section=footer" width="100%"/>

</div>
