import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Firebase config
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(__dirname, "firebase-applet-config.json"), "utf8"));

// Force the project ID in the environment to prevent audience claim mismatches
process.env.GOOGLE_CLOUD_PROJECT = firebaseConfig.projectId;
process.env.FIREBASE_CONFIG = JSON.stringify({
  projectId: firebaseConfig.projectId,
  databaseURL: `https://${firebaseConfig.projectId}.firebaseio.com`,
  storageBucket: firebaseConfig.storageBucket
});

const PRIMARY_ADMIN_EMAIL = "Eduardofabian435@gmail.com";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Firebase Admin inside startServer to handle async deletion
  console.log("Initializing Firebase Admin with Project ID:", firebaseConfig.projectId);
  let adminApp: admin.app.App;

  try {
    // Always ensure we use the correct project ID by deleting any existing app
    // and re-initializing with our explicit config.
    if (admin.apps.length > 0) {
      console.log("Deleting existing Firebase Admin apps to ensure correct project ID.");
      await Promise.all(admin.apps.map(app => app?.delete()));
    }
    
    adminApp = admin.initializeApp({
      projectId: firebaseConfig.projectId,
    });
    console.log("Firebase Admin initialized successfully with project:", firebaseConfig.projectId);
  } catch (e: any) {
    console.error("Firebase Admin initialization failed:", e.message);
    // Fallback to ambient if explicit fails, but this is risky for audience claims
    adminApp = admin.initializeApp({
      projectId: firebaseConfig.projectId,
    });
  }

  const auth = admin.auth();
  const db = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);

  app.use(express.json());

  // Health check
  app.get("/api/health", async (req, res) => {
    try {
      // Test Firestore connection
      await db.collection("users").limit(1).get();
      res.json({ 
        status: "ok", 
        firebase: "connected", 
        databaseId: firebaseConfig.firestoreDatabaseId,
        projectId: firebaseConfig.projectId
      });
    } catch (e: any) {
      console.error("Health check failed:", e.message);
      res.status(500).json({ status: "error", message: e.message });
    }
  });

  // Middleware to verify admin
  const verifyAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("No auth header or invalid format");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const idToken = authHeader.split("Bearer ")[1];
    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      const userEmail = decodedToken.email?.toLowerCase();
      console.log("Token verified:", { uid: decodedToken.uid, email: userEmail });
      
      // Fallback for primary admin - bypass Firestore check entirely
      if (userEmail === PRIMARY_ADMIN_EMAIL.toLowerCase()) {
        console.log("Primary admin detected. Bypassing Firestore check.");
        (req as any).user = decodedToken;
        return next();
      }

      try {
        const userDoc = await db.collection("users").doc(decodedToken.uid).get();
        if (!userDoc.exists) {
          console.log(`User document not found for UID: ${decodedToken.uid}`);
          return res.status(403).json({ error: "Forbidden: User profile not found" });
        }
        
        const userData = userDoc.data();
        console.log("User role from Firestore:", userData?.role);

        if (userData?.role !== "admin") {
          return res.status(403).json({ error: "Forbidden: Admin access required" });
        }

        (req as any).user = decodedToken;
        next();
      } catch (fsError: any) {
        console.error("Firestore lookup failed in verifyAdmin:", fsError.message);
        // If Firestore fails but we are NOT the primary admin, we must deny
        res.status(403).json({ 
          error: "Forbidden: Database access failed", 
          details: fsError.message 
        });
      }
    } catch (error: any) {
      console.error("Token verification failed:", error.message);
      res.status(401).json({ error: "Invalid token", details: error.message });
    }
  };

  // API routes
  app.post("/api/admin/create-user", verifyAdmin, async (req, res) => {
    const { email, password, name, role } = req.body;
    try {
      const userRecord = await auth.createUser({
        email,
        password,
        displayName: name,
      });

      await db.collection("users").doc(userRecord.uid).set({
        uid: userRecord.uid,
        email,
        name,
        role,
      });

      res.json({ uid: userRecord.uid });
    } catch (error: any) {
      console.error("Error creating user:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/admin/update-password", verifyAdmin, async (req, res) => {
    const { uid, newPassword } = req.body;
    try {
      await auth.updateUser(uid, {
        password: newPassword,
      });
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error updating password:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/admin/delete-user", verifyAdmin, async (req, res) => {
    const { uid } = req.body;
    try {
      // Delete from Auth
      await auth.deleteUser(uid);
      // Delete from Firestore
      await db.collection("users").doc(uid).delete();
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting user:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
