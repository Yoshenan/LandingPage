import express, { type Request, type Response, type NextFunction } from 'express';
import path, { basename } from 'path';
import bcrypt from 'bcryptjs';
import { connectDB, User, Log,Telegram } from './db.js';
import session from 'express-session';
import MongoStore from 'connect-mongo';

const app = express();

// 1. Database Initialization
async function startServer() {
  try {
    await connectDB();
  } catch (err) {
    console.error('Failed to connect to database on startup:', err);
  }
}
startServer();

// 2. Global Parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session TypeScript Declaration
declare module 'express-session' {
  interface SessionData {
    username: string;
  }
}

// 3. Session Middleware (MUST be registered before any routes that use req.session)
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: 'mongodb+srv://SYSTEM:IvRoKoZhnNHdbrOk@cluster0.zwk0sb6.mongodb.net/?appName=Cluster0'
  }),

  cookie: {
    maxAge: 600000,
    secure: false,        
    httpOnly: true,
  }

  
}));


app.get('/api/session-info', (req, res) => {
  const maxAge = req.session?.cookie?.maxAge ?? 600000;
  
  // Subtract 2 minutes (120,000 ms) from remaining time
  const WarnTime = Math.max(0, maxAge - 120000);

  res.json({ maxAge, WarnTime });
});

// Route for editing an existing request
app.put('/api/submit/:id', (req, res) => {
  const requestId = req.params.id;
  const updatedData = req.body;

  console.log(`Updating request ${requestId}:`, updatedData);

  // 1. Update the request in your database / storage logic here
  // e.g., await RequestModel.findByIdAndUpdate(requestId, updatedData);

  // 2. Return success response
  res.status(200).json({ 
    message: `Request ${requestId} updated successfully!`, 
    id: requestId, 
    data: updatedData 
  });
});




const disableCache = (req: Request, res: Response, next: NextFunction) => {
  if (!req.path.startsWith('/api')) {
    res.setHeader('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '-1');
  }
  next();
};
app.use(disableCache);


// 5. Auth Middleware Definition
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
   if (req.session && req.session.username) {
     return next();
   }
   return res.status(401).json({ error: 'Unauthorized' });
};

// 6. Static Files & Public Pages
const publicPath = path.join(__dirname, '../../public');
const distPath = path.join(__dirname, '../../dist');

app.use(express.static(publicPath));
app.use('/dist', express.static(distPath));

app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// ==========================================
// 7. PUBLIC API ROUTES (No Auth Required)
// ==========================================

// POST /api/login -> Handles session creation via req.session.regenerate
app.post('/api/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const userDoc = await User.findOne({ username });
    if (!userDoc || !userDoc.password) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, userDoc.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    req.session.regenerate(function (err) {
      if (err) return next(err);

      req.session.username = username;

      req.session.save(function (err) {
        if (err) return next(err);

        res.status(200).json({
          message: 'Login successful',
          role: userDoc.role || 'User',
          companyName: userDoc.companyName,
          user: {
            userId: userDoc._id.toString(),
            username: userDoc.username,
            companyName: userDoc.companyName,
            role: userDoc.role || 'User',
          },
        });
      });
    });

  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/users -> Registration / Create User
app.post('/api/users', async (req, res) => {
  try {
    const { username, password, companyName, role } = req.body;
    if (!username || !password || !companyName) {
      return res.status(400).json({ error: 'Username, password, and companyName are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      username,
      password: hashedPassword,
      companyName,
      role: role || 'User',
    });

    const userObj = newUser.toObject();
    delete (userObj as Record<string, any>).password;

    res.status(201).json(userObj);
  } catch (err) {
    console.error('User Creation Error:', err);
    res.status(400).json({ error: 'Failed to create user' });
  }
});

// Public logs & submissions
app.post('/api/submit', async (req, res) => {
  try {
    const { fullName, email, company, environmentDetails, platForm, Req, num, organization } = req.body;
    const newSubmission = await Log.create({
      fullName, email, company, environmentDetails, platForm, Req, num, organization,
      entry: `Submitted ${Req} request for ${platForm} (${environmentDetails})`,
      username: fullName || email || 'Anonymous',
      companyName: company || 'General'
    });
    return res.status(200).json({ message: 'Form submitted successfully', data: newSubmission });
  } catch (err) {
    console.error('Log Creation Error:', err);
    res.status(400).json({ error: 'Failed to save log entry' });
  }
});

app.post('/api/logs', async (req, res) => {
  try {
    const { details, formattedLog, username, email, companyName, company, entry } = req.body;
    const finalUser = username || email || 'Anonymous';
    const finalCompany = companyName || company || 'General';
    const finalEntry = entry || details || formattedLog;

    if (!finalEntry) {
      return res.status(400).json({ error: 'Log entry content is required.' });
    }

    const newLog = await Log.create({ username: finalUser, companyName: finalCompany, entry: finalEntry });
    return res.status(201).json(newLog);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(400).json({ error: 'Failed to save log entry', details: message });
  }
});

app.get('/api/logs', async (req, res) => {
  try {
    const { companyName } = req.query;
    const filter: Record<string, any> = {};
    if (companyName && typeof companyName === 'string') {
      const escaped = companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.companyName = new RegExp(`^${escaped}$`, 'i');
    }
    const logs = await Log.find(filter).sort({ createdAt: -1 }).limit(50);
    res.status(200).json(logs);
  } catch (err) {
    console.error('Fetch Logs Error:', err);
    res.status(500).json({ error: 'Failed to fetch log entries' });
  }
});


// ==========================================
// 8. PROTECTED API ROUTES (Require requireAuth)
// ==========================================

// GET /api/users -> Fetch all users [PROTECTED]
app.get('/api/users', requireAuth, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json(users);
  } catch (err) {
    console.error('Fetch Users Error:', err);
    res.status(500).json({ error: 'Failed to fetch user list' });
  }
});

// PUT /api/users/:id -> Update existing user [PROTECTED]
app.put('/api/users/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, companyName, role } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (username) user.username = username;
    if (companyName) user.companyName = companyName;
    if (role) user.role = role;
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    await user.save();
    const userObj = user.toObject();
    delete (userObj as Record<string, any>).password;

    res.status(200).json({ message: 'User updated successfully', user: userObj });
  } catch (err) {
    console.error('User Update Error:', err);
    res.status(400).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/users/:id -> Delete user by ID [PROTECTED]
app.delete('/api/users/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'Admin') {
      return res.status(403).json({ error: 'Admin accounts cannot be deleted' });
    }

    await User.findByIdAndDelete(id);
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Revoke User Error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});


app.post('/api/logout', requireAuth, (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Could not log out.' });
    }
    res.clearCookie('connect.sid');
    return res.status(200).json({ message: 'Logout successful' });
  });
});

app.post('/api/submission' , async(req,res) => {

  console.log("TELEGRAM POST RECEIVED:", req.body);
  try{
    const submission = await Telegram.create(req.body)
    res.status(201).json(submission);
  }
  catch(error){
    console.error("Telegram submission ",error);
    res.status(500).json({
      error : "Failed to save submission"
    });
  }

});


app.get('/api/submission',async(req,res) => {
  try{
    const submission = await Telegram.find();
    res.status(200).json(submission);
  }
  catch(error){
    console.error('fetch telegram submission',error);
    res.status(500).json({
      error : "Failed to fetch telegram submissions"

    });

  }

});

app.delete('/api/submission/:id',async (req, res) => {
  try {
    const submission = await Telegram.findByIdAndDelete(req.params.id);

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    res.status(200).json({ message: 'Submission deleted successfully' });
  } catch (err) {
    console.error('telegram delete user error:', err);
    res.status(500).json({ error: 'Failed to delete submission' });
  }
});

// 9. Start Listener
app.listen(3000, '0.0.0.0', () => {
    console.log("Server running on http://10.3.6.112:3000");
});
