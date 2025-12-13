import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Tag interface
 * Represents tags for organizing and searching audio recordings
 */
export interface ITag extends Document {
  name: string;
  arabicName?: string;
  description?: string;
  
  // Usage statistics
  usageCount: number;
  relatedTags: string[];
  
  // Metadata
  createdAt: Date;
  createdBy: mongoose.Types.ObjectId;
  
  // Status
  isActive: boolean;
}

// Static methods interface
interface ITagModel extends Model<ITag> {
  findOrCreate(name: string, createdBy: mongoose.Types.ObjectId): Promise<ITag>;
  processTags(tagString: string, createdBy: mongoose.Types.ObjectId): Promise<string[]>;
  getPopular(limit?: number): Promise<ITag[]>;
  getSuggestions(query: string, limit?: number): Promise<string[]>;
  updateRelatedTags(): Promise<void>;
  createDefaults(createdBy: mongoose.Types.ObjectId): Promise<void>;
}

const TagSchema = new Schema<ITag>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      lowercase: true, // Store tags in lowercase for consistency
      unique: true,
      validate: {
        validator: function(v: string) {
          // Tags should be alphanumeric with spaces, hyphens, and underscores
          return /^[a-zA-Z0-9\s\-_]+$/.test(v);
        },
        message: "Tag name can only contain letters, numbers, spaces, hyphens, and underscores"
      }
    },
    arabicName: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    
    // Usage statistics
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    relatedTags: [{
      type: String,
      lowercase: true,
      trim: true,
    }],
    
    // Metadata
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "AdminUser",
      required: true,
      index: true,
    },
    
    // Status
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: false, // We manage timestamps manually
  }
);

// Indexes for common queries
TagSchema.index({ usageCount: -1, isActive: 1 });
TagSchema.index({ name: 1, isActive: 1 });

// Text search index
TagSchema.index({
  name: "text",
  arabicName: "text",
  description: "text"
});

// Static method to find or create tag
TagSchema.statics.findOrCreate = async function(this: any,
  name: string, 
  createdBy: mongoose.Types.ObjectId
): Promise<ITag> {
  const normalizedName = name.trim().toLowerCase();
  
  let tag = await this.findOne({ name: normalizedName, isActive: true });
  
  if (!tag) {
    tag = new this({
      name: normalizedName,
      createdBy,
      isActive: true,
      usageCount: 0
    });
    await tag.save();
  }
  
  return tag;
};

// Static method to process tag string (comma-separated)
TagSchema.statics.processTags = async function(this: any,
  tagString: string, 
  createdBy: mongoose.Types.ObjectId
): Promise<string[]> {
  if (!tagString || !tagString.trim()) {
    return [];
  }
  
  const tagNames = tagString
    .split(',')
    .map(tag => tag.trim().toLowerCase())
    .filter(tag => tag.length > 0 && tag.length <= 50) // Reasonable tag length limit
    .slice(0, 20); // Limit number of tags per recording
  
  const tags = [];
  for (const tagName of tagNames) {
    const tag = await (this as any).findOrCreate(tagName, createdBy);
    tags.push(tag.name);
  }
  
  return [...new Set(tags)]; // Remove duplicates
};

// Instance method to update usage count
TagSchema.methods.updateUsageCount = async function(): Promise<void> {
  const AudioRecording = mongoose.model("AudioRecording");
  
  const count = await AudioRecording.countDocuments({
    tags: this.name,
    status: "active"
  });
  
  this.usageCount = count;
  await this.save();
};

// Static method to get popular tags
TagSchema.statics.getPopular = async function(this: any, limit: number = 20): Promise<ITag[]> {
  return this.find({ isActive: true, usageCount: { $gt: 0 } })
    .sort({ usageCount: -1 })
    .limit(limit)
    .lean();
};

// Static method to get tag suggestions
TagSchema.statics.getSuggestions = async function(this: any,
  query: string, 
  limit: number = 10
): Promise<string[]> {
  if (!query || query.length < 2) {
    return [];
  }
  
  const tags = await this.find({
    name: { $regex: query.toLowerCase(), $options: 'i' },
    isActive: true
  })
  .sort({ usageCount: -1 })
  .limit(limit)
  .select('name')
  .lean();
  
  return tags.map((tag: any) => tag.name);
};

// Static method to update related tags
TagSchema.statics.updateRelatedTags = async function(this: any): Promise<void> {
  const AudioRecording = mongoose.model("AudioRecording");
  
  // Find recordings with multiple tags to build relationships
  const recordings = await AudioRecording.find({
    status: "active",
    tags: { $exists: true, $not: { $size: 0 } }
  }).select('tags').lean();
  
  const tagRelations = new Map<string, Set<string>>();
  
  // Build tag co-occurrence map
  for (const recording of recordings) {
    const tags = (recording as any).tags;
    for (let i = 0; i < tags.length; i++) {
      for (let j = i + 1; j < tags.length; j++) {
        const tag1 = tags[i];
        const tag2 = tags[j];
        
        if (!tagRelations.has(tag1)) {
          tagRelations.set(tag1, new Set());
        }
        if (!tagRelations.has(tag2)) {
          tagRelations.set(tag2, new Set());
        }
        
        tagRelations.get(tag1)!.add(tag2);
        tagRelations.get(tag2)!.add(tag1);
      }
    }
  }
  
  // Update related tags for each tag
  for (const [tagName, relatedSet] of tagRelations) {
    const relatedTags = Array.from(relatedSet).slice(0, 10); // Limit to top 10 related tags
    await this.updateOne(
      { name: tagName },
      { relatedTags }
    );
  }
};

// Static method to create default tags
TagSchema.statics.createDefaults = async function(this: any, createdBy: mongoose.Types.ObjectId): Promise<void> {
  const defaultTags = [
    "quran", "hadith", "tafsir", "lecture", "dua", "dhikr",
    "fiqh", "aqeedah", "seerah", "ramadan", "hajj", "prayer",
    "marriage", "family", "youth", "women", "children", "arabic",
    "english", "urdu", "friday", "eid", "charity", "patience"
  ];
  
  for (const tagName of defaultTags) {
    await (this as any).findOrCreate(tagName, createdBy);
  }
};

// Export pattern compatible with Next.js hot-reload
const Tag: ITagModel =
  (mongoose.models.Tag as ITagModel) ||
  mongoose.model<ITag>("Tag", TagSchema) as ITagModel;

export default Tag;