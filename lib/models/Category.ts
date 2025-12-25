import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Category interface
 * Represents content categories for Islamic audio recordings
 */
export interface ICategory extends Document {
  name: string;
  arabicName?: string;
  description?: string;
  icon?: string;
  color?: string;
  
  // Hierarchy
  parentCategory?: mongoose.Types.ObjectId;
  subcategories: mongoose.Types.ObjectId[];
  
  // Content
  recordingCount: number;
  
  // Display
  displayOrder: number;
  isVisible: boolean;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// Static methods interface
interface ICategoryModel extends Model<ICategory> {
  createDefaults(): Promise<void>;
  getHierarchy(): Promise<any[]>;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    arabicName: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    icon: {
      type: String,
      trim: true,
      default: "📖", // Default Islamic book icon
    },
    color: {
      type: String,
      trim: true,
      default: "#059669", // Default emerald-600 to match theme
      validate: {
        validator: function(v: string) {
          // Validate hex color format
          return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
        },
        message: "Color must be a valid hex color (e.g., #059669)"
      }
    },
    
    // Hierarchy
    parentCategory: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
    },
    subcategories: [{
      type: Schema.Types.ObjectId,
      ref: "Category",
    }],
    
    // Content statistics
    recordingCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    // Display
    displayOrder: {
      type: Number,
      default: 0,
      index: true,
    },
    isVisible: {
      type: Boolean,
      default: true,
      index: true,
    },
    
    // Metadata
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: true }, // We manage createdAt manually
  }
);

// Indexes for common queries
CategorySchema.index({ displayOrder: 1, isVisible: 1 });
CategorySchema.index({ parentCategory: 1, isVisible: 1 });
CategorySchema.index({ recordingCount: -1, isVisible: 1 });

// Text search index
CategorySchema.index({
  name: "text",
  arabicName: "text",
  description: "text"
});

// Pre-save middleware to update timestamps
CategorySchema.pre("save", function() {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = new Date();
  }
});

// Pre-remove middleware to handle subcategories
CategorySchema.pre("deleteOne", { document: true, query: false }, async function() {
  // Move subcategories to parent or make them root categories
  if (this.subcategories.length > 0) {
    await mongoose.model("Category").updateMany(
      { _id: { $in: this.subcategories } },
      { parentCategory: this.parentCategory || null }
    );
  }
  
  // Update parent's subcategories array
  if (this.parentCategory) {
    const CategoryModel = mongoose.model("Category");
    await CategoryModel.updateOne(
      { _id: this.parentCategory },
      { $pull: { subcategories: this._id } }
    );
  }
});

// Instance method to update recording count
CategorySchema.methods.updateRecordingCount = async function(): Promise<void> {
  const AudioRecording = mongoose.model("AudioRecording");
  
  const count = await AudioRecording.countDocuments({
    category: this._id,
    status: "active"
  });
  
  this.recordingCount = count;
  await this.save();
};

// Static method to get category hierarchy
CategorySchema.statics.getHierarchy = async function(): Promise<any[]> {
  const categories = await this.find({ isVisible: true })
    .sort({ displayOrder: 1, name: 1 })
    .populate("subcategories", "name arabicName icon color recordingCount")
    .lean();
  
  // Build hierarchy tree
  const rootCategories = categories.filter((cat: any) => !cat.parentCategory);
  
  const buildTree = (category: any): any => {
    const children = categories
      .filter((cat: any) => cat.parentCategory?.toString() === category._id.toString())
      .map((cat: any) => buildTree(cat))
      .sort((a: any, b: any) => a.displayOrder - b.displayOrder);
    
    return {
      ...category,
      subcategories: children
    };
  };
  
  return rootCategories.map((cat: any) => buildTree(cat));
};

// Static method to create default categories
CategorySchema.statics.createDefaults = async function(this: any): Promise<void> {
  const defaultCategories = [
    {
      name: "Quran Recitation",
      arabicName: "تلاوة القرآن",
      description: "Beautiful recitations of the Holy Quran",
      icon: "📖",
      color: "#059669",
      displayOrder: 1
    },
    {
      name: "Hadith",
      arabicName: "الحديث",
      description: "Prophetic traditions and sayings",
      icon: "📜",
      color: "#0891b2",
      displayOrder: 2
    },
    {
      name: "Tafsir",
      arabicName: "التفسير",
      description: "Quranic commentary and interpretation",
      icon: "📚",
      color: "#7c3aed",
      displayOrder: 3
    },
    {
      name: "Islamic Lectures",
      arabicName: "المحاضرات الإسلامية",
      description: "Educational Islamic lectures and talks",
      icon: "🎤",
      color: "#dc2626",
      displayOrder: 4
    },
    {
      name: "Adhkar & Dhikr",
      arabicName: "الدعاء والذكر",
      description: "Supplications and remembrance of Allah",
      icon: "🤲",
      color: "#ea580c",
      displayOrder: 5
    },
    {
      name: "Question and Answer",
      arabicName: "الأسئلة والأجوبة",
      description: "Q&A sessions and interactive discussions",
      icon: "❓",
      color: "#9333ea",
      displayOrder: 6
    }
  ];
  
  for (const categoryData of defaultCategories) {
    const exists = await this.findOne({ name: categoryData.name });
    if (!exists) {
      await this.create(categoryData);
    }
  }
};

// Export pattern compatible with Next.js hot-reload
const Category: ICategoryModel =
  (mongoose.models.Category as ICategoryModel) ||
  mongoose.model<ICategory>("Category", CategorySchema) as ICategoryModel;

export default Category;