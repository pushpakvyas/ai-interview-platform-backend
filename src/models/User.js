import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    mobile: { type: String, required: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },

    roleType: {
      type: String,
      enum: ["ADMIN", "CANDIDATE"],
      default: "CANDIDATE",
    },

    // Candidate-specific fields
    technology: [{ type: String }],
    experience: { type: Number, default: 0 },
    currentCompany: { type: String, default: "" },
    currentCTC: { type: Number, default: 0 },
    expectedCTC: { type: Number, default: 0 },
    noticePeriod: { type: String, default: "" },
    resumeUrl: { type: String, default: "" },

    profileCompleted: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },

    refreshTokens: [{ type: String, select: false }],
  },
  { timestamps: true }
);

userSchema.index({ email: 1 });
userSchema.index({ roleType: 1 });

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshTokens;
  return obj;
};

export default mongoose.model("User", userSchema);
