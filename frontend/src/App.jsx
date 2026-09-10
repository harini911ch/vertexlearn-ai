import { BrowserRouter, Routes, Route } from "react-router-dom";

import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CourseDetails from "./pages/CourseDetails";
import LecturePage from "./pages/LecturePage";
import AssignmentPage from "./pages/AssignmentPage";

import InstructorDashboard from "./pages/Instructor_dashboard";
import InstructorSubmissions from "./pages/InstructorSubmissions";
import InstructorStudentSubmissions from "./pages/InstructorStudentSubmissions";
import InstructorQuizzes from "./pages/InstructorQuizzes";

import StudentQuiz from "./pages/StudentQuiz";
import StudentQuizzes from "./pages/StudentQuizzes";
import StudentAssignments from "./pages/StudentAssignments";
import AITutor from "./pages/AITutor";
import StudyPlan from "./pages/StudyPlan";
import StudentProgress from "./pages/StudentProgress";
import Certificates from "./pages/Certificates";
import InstructorCourses from "./pages/InstructorCourses";
import InstructorContent from "./pages/InstructorContent";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminCourses from "./pages/AdminCourses";
import AdminRoles from "./pages/AdminRoles";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import RoleNavbar from "./components/RoleNavbar";
import Profile from "./pages/Profile";
import PageTransition from "./components/PageTransition";


import "./App.css";
function App() {
  return (
    <BrowserRouter>
      <RoleNavbar />

      <div className="app-with-navbar">
  <PageTransition>
    <Routes>

          {/* =========================
              STUDENT ROUTES
          ========================= */}

          <Route
            path="/register"
            element={<Register />}
          />

          <Route
            path="/"
            element={<Login />}
          />

          <Route
            path="/dashboard"
            element={<Dashboard />}
          />

          <Route
            path="/course/:courseId"
            element={<CourseDetails />}
          />

          <Route
            path="/lecture/:lectureId"
            element={<LecturePage />}
          />

          <Route
            path="/ai-tutor"
            element={<AITutor />}
          />

          <Route
            path="/assignment/:assignmentId"
            element={<AssignmentPage />}
          />

          <Route
            path="/student/quizzes"
            element={<StudentQuizzes />}
          />

          <Route
            path="/quiz/:quizId"
            element={<StudentQuiz />}
          />

          <Route
            path="/student/assignments"
            element={<StudentAssignments />}
          />

          <Route
            path="/study-plan"
            element={<StudyPlan />}
          />

          <Route
            path="/student/progress"
            element={<StudentProgress />}
          />

          <Route
            path="/student/certificates"
            element={<Certificates />}
          />
          <Route
  path="/profile"
  element={<Profile />}
/>

          {/* =========================
              INSTRUCTOR ROUTES
          ========================= */}

          <Route
            path="/instructor"
            element={<InstructorCourses />}
          />

          <Route
            path="/instructor/course/:courseId"
            element={<InstructorDashboard />}
          />

          <Route
            path="/instructor/course/:courseId/content"
            element={<InstructorContent />}
          />

          <Route
            path="/instructor/submissions"
            element={<InstructorSubmissions />}
          />

          <Route
            path="/instructor/student/:studentId"
            element={<InstructorStudentSubmissions />}
          />

          <Route
            path="/instructor/quizzes"
            element={<InstructorQuizzes />}
          />

          {/* =========================
              ADMIN ROUTES
          ========================= */}

          <Route
            path="/admin"
            element={
              <AdminProtectedRoute>
                <AdminDashboard />
              </AdminProtectedRoute>
            }
          />

          <Route
            path="/admin/users"
            element={
              <AdminProtectedRoute>
                <AdminUsers />
              </AdminProtectedRoute>
            }
          />

          <Route
            path="/admin/courses"
            element={
              <AdminProtectedRoute>
                <AdminCourses />
              </AdminProtectedRoute>
            }
          />

          <Route
            path="/admin/roles"
            element={
              <AdminProtectedRoute>
                <AdminRoles />
              </AdminProtectedRoute>
            }
          />

            </Routes>
  </PageTransition>
</div>
    </BrowserRouter>
  );
}

export default App;