// import { useState } from "react"
// import { cn } from "@/lib/utils"
// import { Button } from "@/components/ui/button"
// import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { useNavigate } from "react-router"
// import { signUp } from "@/utils/auth"
// // import { CognitoUserPool } from 'amazon-cognito-identity-js'
// // import { cognitoConfig } from '@/config/cognito'


// export function SignUpForm({ className, ...props }) {
//   const [formData, setFormData] = useState({
//     name: "",
//     email: "",
//     password: "",
//     confirmPassword: "",
//   });
//   const [errors, setErrors] = useState({
//     password: "",
//     confirmPassword: "",
//     general: ""
//   });

//   const navigate = useNavigate()

//   const handleLoginPage = () => {
//     navigate("/login")
//   }

//   const handleChange = (e) => {
//     const { name, value } = e.target
//     setFormData((prev) => ({ ...prev, [name]: value }))

//     if (name === "password" || name === "confirmPassword") {
//       setErrors((prev) => ({ ...prev, [name]: "" }))
//     }
//   }

//   const validatePasswords = () => {
//     let isValid = true
//     const newErrors = { password: "", confirmPassword: "" }

//     if (formData.password.length < 8) {
//       newErrors.password = "Password must be at least 8 characters long"
//       isValid = false
//     }

//     if (formData.password !== formData.confirmPassword) {
//       newErrors.confirmPassword = "Passwords do not match"
//       isValid = false
//     }

//     setErrors(newErrors)
//     return isValid
//   }

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     if (validatePasswords()) {
//       signUp(
//         formData.name,
//         formData.email,
//         formData.password,
//         (err, result) => {
//           if (err) {
//             console.error(err);
//             setErrors({ ...errors, general: err.message });
//             return;
//           }
//           navigate('/verify', { state: { email: formData.email } });
//         }
//       );
//     }
//   };


//   return (
//     <div className={cn("flex flex-col gap-6", className)} {...props}>
//       <Card>
//         <CardHeader>
//           <CardTitle className="text-2xl">Sign Up</CardTitle>
//           <CardDescription>Create a new account to get started</CardDescription>
//         </CardHeader>
//         <CardContent>
//           <form onSubmit={handleSubmit}>
//               {errors.general && (
//                 <p className="text-red-500 text-sm mb-4" role="alert">
//                   {errors.general}
//                 </p>
//               )}
//             <div className="flex flex-col gap-6">
//               <div className="grid gap-2">
//                 <Label htmlFor="name">Name</Label>
//                 <Input
//                   id="name"
//                   name="name"
//                   type="text"
//                   placeholder="John Doe"
//                   required
//                   value={formData.name}
//                   onChange={handleChange}
//                 />
//               </div>
//               <div className="grid gap-2">
//                 <Label htmlFor="email">Email</Label>
//                 <Input
//                   id="email"
//                   name="email"
//                   type="email"
//                   placeholder="m@example.com"
//                   required
//                   value={formData.email}
//                   onChange={handleChange}
//                 />
//               </div>
//               <div className="grid gap-2">
//                 <Label htmlFor="password">Password</Label>
//                 <Input
//                   id="password"
//                   name="password"
//                   type="password"
//                   required
//                   value={formData.password}
//                   onChange={handleChange}
//                 />
//                 {errors.password && (
//                   <p className="text-sm text-red-500" role="alert">
//                     {errors.password}
//                   </p>
//                 )}
//               </div>
//               <div className="grid gap-2">
//                 <Label htmlFor="confirmPassword">Confirm Password</Label>
//                 <Input
//                   id="confirmPassword"
//                   name="confirmPassword"
//                   type="password"
//                   required
//                   value={formData.confirmPassword}
//                   onChange={handleChange}
//                 />
//                 {errors.confirmPassword && (
//                   <p className="text-sm text-red-500" role="alert">
//                     {errors.confirmPassword}
//                   </p>
//                 )}
//               </div>
//               <Button type="submit" className="w-full">
//                 Sign Up
//               </Button>
//             </div>
//             <div className="mt-4 text-center text-sm">
//               Already have an account?{" "}
//               <Button variant="ghost" onClick={handleLoginPage}>
//                 Log In
//               </Button>
//             </div>
//           </form>
//         </CardContent>
//       </Card>
//     </div>
//   )
// }

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useNavigate } from "react-router"
import { signUp } from "@/utils/auth"
import { CheckCircle2, XCircle, Eye, EyeOff } from "lucide-react"

export function SignUpForm({ className, ...props }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })

  const [errors, setErrors] = useState({
    password: "",
    confirmPassword: "",
    general: "",
  })

  const [passwordCriteria, setPasswordCriteria] = useState({
    hasNumber: false,
    hasSpecialChar: false,
    hasUpperCase: false,
    hasLowerCase: false,
    isMinLength: false,
  })

  const navigate = useNavigate()

  const handleLoginPage = () => {
    navigate("/login")
  }

  useEffect(() => {
    if (formData.password) {
      checkPasswordStrength(formData.password)
    }
  }, [formData.password])

  const checkPasswordStrength = (password) => {
    setPasswordCriteria({
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+/.test(password),
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      isMinLength: password.length >= 8,
    })
  }

  // Update form data and clear errors as the user types.
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Immediately clear any errors for password-related fields.
    if (name === "password" || name === "confirmPassword") {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  // Validate field-specific rules when the user leaves an input.
  const handleBlur = (e) => {
    const { name } = e.target

    if (name === "password") {
      if (!passwordCriteria.isMinLength) {
        setErrors((prev) => ({
          ...prev,
          password: "Password must be at least 8 characters",
        }))
      } else {
        setErrors((prev) => ({ ...prev, password: "" }))
      }
    }

    if (name === "confirmPassword") {
      if (formData.confirmPassword !== formData.password) {
        setErrors((prev) => ({
          ...prev,
          confirmPassword: "Passwords do not match",
        }))
      } else {
        setErrors((prev) => ({ ...prev, confirmPassword: "" }))
      }
    }
  }

  // Validate all password rules and confirm match before submission.
  const validatePasswords = () => {
    const { hasNumber, hasSpecialChar, hasUpperCase, hasLowerCase, isMinLength } = passwordCriteria
    const allCriteriaMet = hasNumber && hasSpecialChar && hasUpperCase && hasLowerCase && isMinLength

    if (!allCriteriaMet) {
      setErrors((prev) => ({
        ...prev,
        password: "Password does not meet all requirements",
      }))
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      setErrors((prev) => ({
        ...prev,
        confirmPassword: "Passwords do not match",
      }))
      return false
    }

    return true
  }

  // Submit handler that performs a final validation before signing up.
  const handleSubmit = (e) => {
    e.preventDefault()
    if (validatePasswords()) {
      signUp(formData.name, formData.email, formData.password, (err, result) => {
        if (err) {
          console.error(err)
          setErrors({ ...errors, general: err.message })
          return
        }
        navigate("/verify", { state: { email: formData.email } })
      })
    }
  }

  const CriteriaItem = ({ met, text }) => (
    <div className="flex items-center gap-2 text-sm">
      {met ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-gray-300" />}
      <span className={met ? "text-green-500" : "text-gray-500"}>{text}</span>
    </div>
  )

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Sign Up</CardTitle>
          <CardDescription>Create a new account to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            {errors.general && (
              <p className="text-red-500 text-sm mb-4" role="alert">
                {errors.general}
              </p>
            )}
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="John Doe"
                  required
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={
                      formData.password
                        ? Object.values(passwordCriteria).every(Boolean)
                          ? "border-green-500"
                          : "border-orange-300"
                        : ""
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>

                {errors.password && (
                  <p className="text-sm text-red-500" role="alert">
                    {errors.password}
                  </p>
                )}
                {formData.password.length > 0 && (
                  <div className="mt-2 p-3 rounded-md">
                    <p className="text-sm font-medium mb-2">Password must contain:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <CriteriaItem met={passwordCriteria.isMinLength} text="At least 8 characters" />
                      <CriteriaItem met={passwordCriteria.hasNumber} text="At least 1 number" />
                      <CriteriaItem met={passwordCriteria.hasSpecialChar} text="At least 1 special character" />
                      <CriteriaItem met={passwordCriteria.hasUpperCase} text="At least 1 uppercase letter" />
                      <CriteriaItem met={passwordCriteria.hasLowerCase} text="At least 1 lowercase letter" />
                    </div>
                  </div>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={
                      formData.confirmPassword
                        ? formData.password === formData.confirmPassword
                          ? "border-green-500"
                          : "border-red-300"
                        : ""
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500" role="alert">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={
                  !Object.values(passwordCriteria).every(Boolean) || formData.password !== formData.confirmPassword
                }
              >
                Sign Up
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Already have an account?{" "}
              <Button variant="ghost" onClick={handleLoginPage}>
                Log In
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}