import {
  createUserWithEmailAndPassword,
  deleteUser,
} from "firebase/auth";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { auth, db } from "../firebase";
import Footer from "./Footer";

import "../css/Register.css";


function Register() {
  const location = useLocation();
  const navigate = useNavigate();

  /* =====================================================
     STATE
  ===================================================== */

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",

    phone: "",
    studentId: "",

    department: "",
    collegeDept: "",
    block: "",
    yearLevel: "",

    shsCourse: "",
    jhsGradeLevel: "",
    elementaryGradeLevel: "",

    gender: "",

    birthMonth: "",
    birthDay: "",
    birthYear: "",

    email: "",
    password: "",
    confirmPassword: "",

    role: "",
  });


  /* =====================================================
     OAUTH DATA
  ===================================================== */

  const oauthData = location.state || null;


  /* =====================================================
     DATE OPTIONS
  ===================================================== */

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const currentYear = new Date().getFullYear();

  const years = Array.from(
    { length: 100 },
    (_, index) => currentYear - index
  );

  const days = Array.from(
    { length: 31 },
    (_, index) => index + 1
  );


  /* =====================================================
     HELPERS
  ===================================================== */

  const isStudent = formData.role === "student";
  const isAdmin = formData.role === "admin";

  const isElementaryStudent =
    isStudent && formData.department === "Elementary";


  /* =====================================================
     OAUTH PREFILL
  ===================================================== */

  useEffect(() => {
    if (!oauthData?.email) {
      return;
    }

    const names = oauthData.displayName
      ? oauthData.displayName.split(" ")
      : ["", ""];

    setFormData((previous) => ({
      ...previous,
      email: oauthData.email,
      firstName: names[0] || "",
      lastName: names.slice(1).join(" ") || "",
    }));
  }, [oauthData]);


  /* =====================================================
     CLEAR MESSAGES WHEN PAGE CHANGES
  ===================================================== */

  useEffect(() => {
    setError("");
    setSuccess("");
  }, [location.pathname]);


  /* =====================================================
     NAVIGATION
  ===================================================== */

  const goToLogin = () => {
    setError("");
    setSuccess("");
    navigate("/login");
  };

  const goHome = () => {
    setError("");
    setSuccess("");
    navigate("/");
  };


  /* =====================================================
     INPUT HANDLER
  ===================================================== */

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    if (name === "department") {
      setFormData((previous) => ({
        ...previous,
        department: value,
        collegeDept: "",
        block: "",
        yearLevel: "",
        shsCourse: "",
        jhsGradeLevel: "",
        elementaryGradeLevel: "",
        phone: value === "Elementary" ? "" : previous.phone,
      }));
    } else {
      setFormData((previous) => ({
        ...previous,
        [name]: value,
      }));
    }

    setError("");
    setSuccess("");
  };


  /* =====================================================
     BIRTHDATE
  ===================================================== */

  const getBirthdate = () => {
    if (
      !formData.birthYear ||
      !formData.birthMonth ||
      !formData.birthDay
    ) {
      return "";
    }

    return (
      `${formData.birthYear}-` +
      `${String(formData.birthMonth).padStart(2, "0")}-` +
      `${String(formData.birthDay).padStart(2, "0")}`
    );
  };


  /* =====================================================
     ROLE-SPECIFIC DATA
  ===================================================== */

  const getRoleSpecificData = () => {
    const birthdate = getBirthdate();

    /* ---------------- STUDENT ---------------- */

    if (isStudent) {
      const studentData = {
        studentId: formData.studentId || "",
        department: formData.department || "",
        gender: formData.gender || "",
        birthdate,
        elementaryGradeLevel:
          formData.elementaryGradeLevel || "",
      };

      if (formData.department !== "Elementary") {
        studentData.phone = formData.phone || "";
      }

      if (formData.department === "College") {
        return {
          ...studentData,
          collegeDept: formData.collegeDept || "",
          block: formData.block || "",
          yearLevel: formData.yearLevel || "",
        };
      }

      if (formData.department === "Senior High") {
        return {
          ...studentData,
          shsCourse: formData.shsCourse || "",
        };
      }

      if (formData.department === "Junior High") {
        return {
          ...studentData,
          jhsGradeLevel: formData.jhsGradeLevel || "",
        };
      }

      return studentData;
    }


    /* ---------------- ADMIN ---------------- */

    if (isAdmin) {
      return {
        phone: formData.phone || "",
        gender: formData.gender || "",
        birthdate,
      };
    }


    return {};
  };


  /* =====================================================
     CHECK ADMIN LIMIT
     
     IMPORTANT:
     This function is ONLY called after Firebase
     Authentication has successfully created the user.
  ===================================================== */

  const checkAdminLimit = async () => {
    const adminQuery = query(
      collection(db, "users"),
      where("role", "==", "admin")
    );

    const adminSnapshot = await getDocs(adminQuery);

    return adminSnapshot.size < 10;
  };


  /* =====================================================
     VALIDATION
  ===================================================== */

  const validateForm = () => {
    if (!formData.role) {
      setError("Please select a role first.");
      return false;
    }


    /* ---------------- NAME ---------------- */

    if (!formData.firstName.trim()) {
      setError("Please enter your first name.");
      return false;
    }

    if (!formData.lastName.trim()) {
      setError("Please enter your last name.");
      return false;
    }


    /* ---------------- BIRTHDATE ---------------- */

    if (
      !formData.birthMonth ||
      !formData.birthDay ||
      !formData.birthYear
    ) {
      setError("Please complete your birthdate.");
      return false;
    }


    /* ---------------- EMAIL/PASSWORD ---------------- */

    if (!oauthData) {
      if (!formData.email.trim()) {
        setError("Please enter your email address.");
        return false;
      }

      if (!formData.password) {
        setError("Please enter a password.");
        return false;
      }

      if (formData.password.length < 6) {
        setError("Password should be at least 6 characters.");
        return false;
      }

      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match.");
        return false;
      }
    }


    /* ---------------- ADMIN ---------------- */

    if (isAdmin) {
      if (!formData.phone.trim()) {
        setError("Please enter your phone number.");
        return false;
      }
    }


    /* ---------------- STUDENT ---------------- */

    if (isStudent) {
      if (!formData.studentId.trim()) {
        setError("Please enter your Student ID.");
        return false;
      }

      if (!formData.department) {
        setError("Please select your department.");
        return false;
      }


      /* COLLEGE */

      if (formData.department === "College") {
        if (!formData.collegeDept) {
          setError("Please select your college department.");
          return false;
        }

        if (!formData.block) {
          setError("Please select your block.");
          return false;
        }

        if (!formData.yearLevel) {
          setError("Please select your year level.");
          return false;
        }
      }


      /* SENIOR HIGH */

      if (
        formData.department === "Senior High" &&
        !formData.shsCourse
      ) {
        setError(
          "Please select your Senior High strand/track."
        );
        return false;
      }


      /* JUNIOR HIGH */

      if (
        formData.department === "Junior High" &&
        !formData.jhsGradeLevel
      ) {
        setError("Please select your grade level.");
        return false;
      }


      /* ELEMENTARY */

      if (
        formData.department === "Elementary" &&
        !formData.elementaryGradeLevel
      ) {
        setError("Please select your grade level.");
        return false;
      }
    }

    return true;
  };


  /* =====================================================
     CREATE FIRESTORE PROFILE
  ===================================================== */

  const createUserProfile = async (user) => {
    if (!user?.uid) {
      throw new Error(
        "Firebase Authentication did not return a valid UID."
      );
    }

    const extraRoleData = getRoleSpecificData();

    const userRef = doc(db, "users", user.uid);

    const userProfile = {
      uid: user.uid,

      fullName:
        `${formData.firstName} ${formData.lastName}`.trim(),

      email:
        user.email || formData.email.trim(),

      ...extraRoleData,

      role: formData.role,

      createdAt: serverTimestamp(),
    };

    await setDoc(userRef, userProfile);

    const savedProfile = await getDoc(userRef);

    if (!savedProfile.exists()) {
      throw new Error(
        "Firebase Authentication account was created, but the Firestore user profile was not found."
      );
    }

    const savedData = savedProfile.data();

    if (!savedData.role) {
      throw new Error(
        "Firestore profile was created, but the user's role is missing."
      );
    }

    return savedData;
  };


  /* =====================================================
     REGISTRATION HANDLER
  ===================================================== */

  const handleSignUp = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    let createdFirebaseUser = null;

    try {
      /* ================================================
         1. VALIDATE FORM
      ================================================= */

      const isValid = validateForm();

      if (!isValid) {
        return;
      }


      /* ================================================
         2. OAUTH REGISTRATION
         
         Google account has already authenticated the user.
      ================================================= */

      if (oauthData?.uid) {
        const userRef = doc(
          db,
          "users",
          oauthData.uid
        );


        /* -----------------------------------------------
           Check whether profile already exists
        ------------------------------------------------ */

        const existingProfile = await getDoc(userRef);

        if (existingProfile.exists()) {
          setError(
            "This Google account already has an OyFound profile."
          );
          return;
        }


        /* -----------------------------------------------
           Check admin limit
        ------------------------------------------------ */

        if (isAdmin) {
          const adminAllowed =
            await checkAdminLimit();

          if (!adminAllowed) {
            setError(
              "Registration failed: The maximum of 10 admin accounts has been reached."
            );
            return;
          }
        }


        /* -----------------------------------------------
           Create Google user profile
        ------------------------------------------------ */

        const extraRoleData =
          getRoleSpecificData();

        const userProfile = {
          uid: oauthData.uid,

          fullName:
            `${formData.firstName} ${formData.lastName}`.trim(),

          email:
            formData.email.trim(),

          ...extraRoleData,

          role: formData.role,

          createdAt: serverTimestamp(),
        };

        await setDoc(
          userRef,
          userProfile
        );


        /* -----------------------------------------------
           Verify profile
        ------------------------------------------------ */

        const savedProfile =
          await getDoc(userRef);

        if (!savedProfile.exists()) {
          throw new Error(
            "Google account exists, but its Firestore profile could not be created."
          );
        }


        if (!savedProfile.data()?.role) {
          throw new Error(
            "Google account profile was created, but the user's role is missing."
          );
        }


        /* -----------------------------------------------
           Success
        ------------------------------------------------ */

        setSuccess(
          "Account created successfully."
        );

        navigate("/login", {
          state: {
            registered: true,
            email: formData.email.trim(),
          },
        });

        return;
      }


      /* ================================================
         3. NORMAL EMAIL REGISTRATION
         
         Authentication MUST happen first.
         This gives Firestore request.auth a valid UID.
      ================================================= */

      const result =
        await createUserWithEmailAndPassword(
          auth,
          formData.email.trim(),
          formData.password
        );

      const user = result.user;

      createdFirebaseUser = user;


      if (!user?.uid) {
        throw new Error(
          "Firebase Authentication created the account but did not return a valid UID."
        );
      }


      /* ================================================
         4. CHECK ADMIN LIMIT
         
         This happens AFTER authentication.
      ================================================= */

      if (isAdmin) {
        const adminAllowed =
          await checkAdminLimit();

        if (!adminAllowed) {
          /*
           * Remove the newly created Firebase account
           * because the 10-admin limit has already
           * been reached.
           */

          await deleteUser(user);

          createdFirebaseUser = null;

          const adminLimitError =
            new Error(
              "The maximum of 10 admin accounts has been reached."
            );

          adminLimitError.code =
            "admin-limit-reached";

          throw adminLimitError;
        }
      }


      /* ================================================
         5. CREATE FIRESTORE PROFILE
      ================================================= */

      await createUserProfile(user);


      /* ================================================
         6. SUCCESS
      ================================================= */

      setSuccess(
        "Account created successfully."
      );

      navigate("/login", {
        state: {
          registered: true,
          email: formData.email.trim(),
        },
      });

    } catch (err) {
      console.error(
        "Registration error:",
        err
      );


      /* ================================================
         ROLLBACK FIREBASE AUTH ACCOUNT
         
         Only happens when a normal email account was
         created but Firestore/profile creation failed.
      ================================================= */

      if (
        createdFirebaseUser &&
        err.code !== "auth/email-already-in-use"
      ) {
        try {
          await deleteUser(
            createdFirebaseUser
          );
        } catch (deleteError) {
          console.error(
            "Could not roll back Firebase Authentication account:",
            deleteError
          );
        }
      }


      /* ================================================
         ERROR HANDLING
      ================================================= */

      switch (err.code) {

        case "admin-limit-reached":
          setError(
            "Registration failed: The maximum of 10 admin accounts has been reached."
          );
          break;


        case "auth/email-already-in-use":
          setError(
            "The email is already taken. Please use a different email or login."
          );
          break;


        case "auth/invalid-email":
          setError(
            "Please enter a valid email address."
          );
          break;


        case "auth/weak-password":
          setError(
            "Password should be at least 6 characters."
          );
          break;


        case "auth/network-request-failed":
          setError(
            "Network error. Please check your internet connection and try again."
          );
          break;


        case "permission-denied":
        case "PERMISSION_DENIED":
        case "firestore/permission-denied":
          setError(
            "Firestore rejected the user profile. Please check your Firestore Rules."
          );
          break;


        case "auth/popup-closed-by-user":
          setError(
            "Google registration was cancelled."
          );
          break;


        default:
          setError(
            err?.message
              ? `Registration failed: ${err.message}`
              : "Registration failed. Please try again."
          );
      }

    } finally {
      setLoading(false);
    }
  };


  /* =====================================================
     INPUT COMPONENT
  ===================================================== */

  const renderInput = (
    name,
    placeholder,
    type = "text",
    required = false
  ) => (
    <input
      type={type}
      name={name}
      placeholder={placeholder}
      value={formData[name]}
      onChange={handleInputChange}
      required={required}
    />
  );


  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="auth-page">

      <div className="auth-background">
        <div className="auth-orb auth-orb-one"></div>
        <div className="auth-orb auth-orb-two"></div>
        <div className="auth-orb auth-orb-three"></div>
      </div>


      <div className="auth-card register-card">

        {/* =================================================
            FORM PANEL
        ================================================= */}

        <div className="form-panel register-form-panel">

          <div className="form-wrapper register-wrapper">

            <h2>Create an Account</h2>


            {/* ERROR */}

            {error && (
              <div className="auth-error">
                {error}
              </div>
            )}


            {/* SUCCESS */}

            {success && (
              <div className="auth-success">
                {success}
              </div>
            )}


            <form onSubmit={handleSignUp}>

              <div className="register-grid">

                {/* =========================================
                    FIRST NAME
                ========================================= */}

                <div>
                  {renderInput(
                    "firstName",
                    "First Name",
                    "text",
                    true
                  )}
                </div>


                {/* =========================================
                    LAST NAME
                ========================================= */}

                <div>
                  {renderInput(
                    "lastName",
                    "Last Name",
                    "text",
                    true
                  )}
                </div>


                {/* =========================================
                    ROLE
                ========================================= */}

                <div>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    required
                  >
                    <option
                      value=""
                      disabled
                    >
                      Select Role
                    </option>

                    <option value="student">
                      Student
                    </option>

                    <option value="admin">
                      Admin
                    </option>
                  </select>
                </div>


                {/* =========================================
                    STUDENT FIELDS
                ========================================= */}

                {isStudent && (
                  <>

                    {/* STUDENT ID */}

                    <div>
                      {renderInput(
                        "studentId",
                        "Student ID",
                        "text",
                        true
                      )}
                    </div>


                    {/* DEPARTMENT */}

                    <div>
                      <select
                        name="department"
                        value={formData.department}
                        onChange={handleInputChange}
                        required
                      >
                        <option
                          value=""
                          disabled
                        >
                          Select Department
                        </option>

                        <option value="College">
                          College
                        </option>

                        <option value="Senior High">
                          Senior High
                        </option>

                        <option value="Junior High">
                          Junior High
                        </option>

                        <option value="Elementary">
                          Elementary
                        </option>
                      </select>
                    </div>


                    {/* =====================================
                        ELEMENTARY
                    ===================================== */}

                    {formData.department ===
                      "Elementary" && (
                      <div className="full-width">

                        <select
                          name="elementaryGradeLevel"
                          value={
                            formData.elementaryGradeLevel
                          }
                          onChange={handleInputChange}
                          required
                        >
                          <option
                            value=""
                            disabled
                          >
                            Select Grade Level
                          </option>

                          <option value="1">
                            Grade 1
                          </option>

                          <option value="2">
                            Grade 2
                          </option>

                          <option value="3">
                            Grade 3
                          </option>

                          <option value="4">
                            Grade 4
                          </option>

                          <option value="5">
                            Grade 5
                          </option>

                          <option value="6">
                            Grade 6
                          </option>
                        </select>

                      </div>
                    )}


                    {/* =====================================
                        COLLEGE
                    ===================================== */}

                    {formData.department ===
                      "College" && (
                      <>

                        <div>
                          <select
                            name="collegeDept"
                            value={
                              formData.collegeDept
                            }
                            onChange={
                              handleInputChange
                            }
                            required
                          >
                            <option
                              value=""
                              disabled
                            >
                              Select Program
                            </option>

                            <option value="BEED">
                              BEED
                            </option>

                            <option value="BSED">
                              BSED
                            </option>

                            <option value="BPED">
                              BPED
                            </option>

                            <option value="BSEntrep">
                              BSEntrep
                            </option>

                            <option value="BSHM">
                              BSHM
                            </option>

                            <option value="BSIT">
                              BSIT
                            </option>
                          </select>
                        </div>


                        <div>
                          <select
                            name="block"
                            value={formData.block}
                            onChange={
                              handleInputChange
                            }
                            required
                          >
                            <option
                              value=""
                              disabled
                            >
                              Select Block
                            </option>

                            <option value="A">
                              Block A
                            </option>

                            <option value="B">
                              Block B
                            </option>

                            <option value="C">
                              Block C
                            </option>

                            <option value="D">
                              Block D
                            </option>

                            <option value="E">
                              Block E
                            </option>
                          </select>
                        </div>


                        <div>
                          <select
                            name="yearLevel"
                            value={
                              formData.yearLevel
                            }
                            onChange={
                              handleInputChange
                            }
                            required
                          >
                            <option
                              value=""
                              disabled
                            >
                              Select Year Level
                            </option>

                            <option value="1">
                              1st Year
                            </option>

                            <option value="2">
                              2nd Year
                            </option>

                            <option value="3">
                              3rd Year
                            </option>

                            <option value="4">
                              4th Year
                            </option>
                          </select>
                        </div>

                      </>
                    )}


                    {/* =====================================
                        SENIOR HIGH
                    ===================================== */}

                    {formData.department ===
                      "Senior High" && (
                      <div className="full-width">

                        <select
                          name="shsCourse"
                          value={
                            formData.shsCourse
                          }
                          onChange={
                            handleInputChange
                          }
                          required
                        >
                          <option
                            value=""
                            disabled
                          >
                            Select Strand / Track
                          </option>

                          <option value="ABM">
                            ABM
                          </option>

                          <option value="HUMSS">
                            HUMSS
                          </option>

                          <option value="STEM">
                            STEM
                          </option>

                          <option value="TVL: ICT">
                            TVL: ICT
                          </option>

                          <option value="TVL: HE">
                            TVL: HE
                          </option>
                        </select>

                      </div>
                    )}


                    {/* =====================================
                        JUNIOR HIGH
                    ===================================== */}

                    {formData.department ===
                      "Junior High" && (
                      <div className="full-width">

                        <select
                          name="jhsGradeLevel"
                          value={
                            formData.jhsGradeLevel
                          }
                          onChange={
                            handleInputChange
                          }
                          required
                        >
                          <option
                            value=""
                            disabled
                          >
                            Select Grade Level
                          </option>

                          <option value="7">
                            Grade 7
                          </option>

                          <option value="8">
                            Grade 8
                          </option>

                          <option value="9">
                            Grade 9
                          </option>

                          <option value="10">
                            Grade 10
                          </option>
                        </select>

                      </div>
                    )}


                    {/* =====================================
                        GENDER
                    ===================================== */}

                    <div>
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleInputChange}
                        required
                      >
                        <option
                          value=""
                          disabled
                        >
                          Select Gender
                        </option>

                        <option value="male">
                          Male
                        </option>

                        <option value="female">
                          Female
                        </option>

                        <option value="other">
                          Other
                        </option>
                      </select>
                    </div>


                    {/* =====================================
                        PHONE
                    ===================================== */}

                    {!isElementaryStudent && (
                      <div>
                        {renderInput(
                          "phone",
                          "Phone Number",
                          "tel",
                          true
                        )}
                      </div>
                    )}

                  </>
                )}


                {/* =========================================
                    ADMIN FIELDS
                ========================================= */}

                {isAdmin && (
                  <>

                    <div>
                      {renderInput(
                        "phone",
                        "Phone Number",
                        "tel",
                        true
                      )}
                    </div>


                    <div>
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleInputChange}
                        required
                      >
                        <option
                          value=""
                          disabled
                        >
                          Select Gender
                        </option>

                        <option value="male">
                          Male
                        </option>

                        <option value="female">
                          Female
                        </option>

                        <option value="other">
                          Other
                        </option>
                      </select>
                    </div>

                  </>
                )}


                {/* =========================================
                    BIRTHDATE
                ========================================= */}

                {formData.role && (
                  <div className="birthdate-field full-width">

                    <label>
                      Birthdate
                    </label>

                    <div className="birthdate-grid">

                      <select
                        name="birthMonth"
                        value={formData.birthMonth}
                        onChange={handleInputChange}
                        required
                      >
                        <option
                          value=""
                          disabled
                        >
                          Month
                        </option>

                        {months.map(
                          (month, index) => (
                            <option
                              key={month}
                              value={index + 1}
                            >
                              {month}
                            </option>
                          )
                        )}
                      </select>


                      <select
                        name="birthDay"
                        value={formData.birthDay}
                        onChange={handleInputChange}
                        required
                      >
                        <option
                          value=""
                          disabled
                        >
                          Day
                        </option>

                        {days.map((day) => (
                          <option
                            key={day}
                            value={day}
                          >
                            {day}
                          </option>
                        ))}
                      </select>


                      <select
                        name="birthYear"
                        value={formData.birthYear}
                        onChange={handleInputChange}
                        required
                      >
                        <option
                          value=""
                          disabled
                        >
                          Year
                        </option>

                        {years.map((year) => (
                          <option
                            key={year}
                            value={year}
                          >
                            {year}
                          </option>
                        ))}
                      </select>

                    </div>
                  </div>
                )}


                {/* =========================================
                    EMAIL
                ========================================= */}

                {!oauthData && (
                  <div className="full-width">
                    {renderInput(
                      "email",
                      "Email Address",
                      "email",
                      true
                    )}
                  </div>
                )}


                {/* =========================================
                    PASSWORD
                ========================================= */}

                {!oauthData && (
                  <>

                    <div>
                      {renderInput(
                        "password",
                        "Password",
                        "password",
                        true
                      )}
                    </div>


                    <div>
                      {renderInput(
                        "confirmPassword",
                        "Confirm Password",
                        "password",
                        true
                      )}
                    </div>

                  </>
                )}

              </div>


              {/* ===========================================
                  SUBMIT
              =========================================== */}

              <button
                type="submit"
                className="primary-form-button register-submit"
                disabled={loading}
              >
                {loading
                  ? "CREATING ACCOUNT..."
                  : oauthData
                  ? "FINISH REGISTRATION"
                  : "REGISTER"}
              </button>

            </form>

          </div>
        </div>


        {/* =================================================
            WELCOME PANEL
        ================================================= */}

        <div className="welcome-panel">

          <div className="welcome-panel-content">

            <div className="welcome-eyebrow">
              OYFOUND
            </div>

            <h1>
              Welcome!
            </h1>

            <p>
              Create your OyFound account and help
              lost belongings find their way home.
            </p>

            <div className="welcome-divider"></div>

            <p className="welcome-small-text">
              Already have an account?
            </p>

            <button
              type="button"
              className="outline-auth-button"
              onClick={goToLogin}
            >
              LOGIN
            </button>

          </div>

        </div>

      </div>


      {/* ===================================================
          FOOTER
      =================================================== */}

      <Footer />

    </div>
  );
}


export default Register;