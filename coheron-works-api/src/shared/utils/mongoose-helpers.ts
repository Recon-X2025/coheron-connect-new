import mongoose from 'mongoose';

export function toObjectId(id: string): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId(id);
}

export function transformDoc(doc: any): any {
  if (!doc) return doc;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  if (obj._id) {
    obj.id = obj._id.toString();
  }
  return obj;
}

export function transformDocs(docs: any[]): any[] {
  return docs.map(transformDoc);
}

export function buildFilter(query: Record<string, any>, fieldMap: Record<string, string | ((val: any) => any)>): Record<string, any> {
  const filter: any = {};
  for (const [queryKey, mapping] of Object.entries(fieldMap)) {
    const val = query[queryKey];
    if (val === undefined || val === null || val === '') continue;
    if (typeof mapping === 'function') {
      Object.assign(filter, mapping(val));
    } else {
      filter[mapping] = val;
    }
  }
  return filter;
}

export function searchFilter(fields: string[], search: string): any {
  return {
    $or: fields.map(f => ({ [f]: { $regex: search, $options: 'i' } }))
  };
}

export const defaultSchemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: {
    virtuals: true,
    transform: (_doc: any, ret: any) => {
      ret.id = ret._id;
      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform: (_doc: any, ret: any) => {
      ret.id = ret._id;
      return ret;
    }
  }
};
