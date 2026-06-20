import { TreeNode } from 'primeng/api';

export interface FamilyTreeNode extends TreeNode {
  data?: {
    gender?: string;
    address?: string;
    phoneNumber?: string;
    fatherName?: string;
  };
}
