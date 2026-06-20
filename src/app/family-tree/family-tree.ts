import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterModule } from '@angular/router'; // Ensure router tracking is active
import { TreeModule } from 'primeng/tree';
import { TreeNode } from 'primeng/api';
import { OrganizationChartModule } from 'primeng/organizationchart';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  FormsModule,
} from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { FamilyTreeNode } from './family.interface';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  standalone: true,
  imports: [
    TreeModule,
    OrganizationChartModule,
    ReactiveFormsModule,
    FormsModule,
    DialogModule,
    TooltipModule,
    RouterModule,
    RouterLink,
  ],
  selector: 'app-family-tree',
  templateUrl: './family-tree.html',
  styleUrl: './family-tree.scss',
})
export class FamilyTree implements OnInit {
  @Input() treeId: string = 'main';
  currentTreeId = '';
  // Dynamic Title tracking variable
  treeTitle: string = 'شجرة العائلة';

  // Mapping lookup table for localized titles
  private titleMapping: { [key: string]: string } = {
    main: 'شجرة العائلة الرئيسية',
    'abu-ismail': 'شجرة عائلة أبو إسماعيل والعلاقات العائلية المرتبطة بها',
    'abu-ibido': 'شجرة عائلة  عبيدو والعلاقات العائلية المرتبطة بها',
    khalil: 'شجرة عائلة خليل والعلاقات العائلية المرتبطة بها',
  };

  childForm!: FormGroup;
  isRootNode: boolean = false;
  showDialog = false;
  data: FamilyTreeNode[] = [];
  selectedNode: FamilyTreeNode | null = null;

  constructor(
    private fb: FormBuilder,
    private firestore: Firestore,
    private cd: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    this.buildForm();

    // Dynamically listen to route changes if applicable
    this.route.paramMap.subscribe((params) => {
      const id = params.get('treeId');
      this.treeId = id ? id : 'main';
      this.currentTreeId = this.treeId;

      // Update the template title dynamically based on selection match
      this.treeTitle = this.titleMapping[this.treeId] || 'شجرة العائلة';

      this.loadTree();
    });
  }

  onSelectChange(event: any) {
    this.router.navigate(['/tree', this.currentTreeId]);
    // this.treeId = this.currentTreeId;
    // this.loadTree();
  }

  openRootDialog() {
    this.isRootNode = true;
    this.selectedNode = null;
    this.childForm.reset();
    this.showDialog = true;
  }

  async loadTree() {
    // Reads dynamically from 'familyTrees/[treeId]' document endpoint
    const ref = doc(this.firestore, `familyTrees/${this.treeId}`);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const data = snap.data();
      if (data && data['data']) {
        this.data = JSON.parse(JSON.stringify(data['data']));
        this.cd.detectChanges();
        console.log(`Loaded from document path "familyTrees/${this.treeId}":`, this.data);
      }
    } else {
      this.data = [];
      this.cd.detectChanges();
    }
  }

  buildForm() {
    this.childForm = this.fb.group({
      name: ['', Validators.required],
      gender: [null, Validators.required],
      address: [''],
      phoneNumber: [''],
    });
  }

  openAddChildDialog(node: TreeNode, event: Event) {
    event.stopPropagation();
    this.selectedNode = node;
    this.showDialog = true;
    this.childForm.reset();
  }

  async saveTree() {
    // Writes dynamically to 'familyTrees/[treeId]' document endpoint
    const ref = doc(this.firestore, `familyTrees/${this.treeId}`);
    await setDoc(
      ref,
      {
        data: this.data,
        updatedAt: new Date(),
      },
      { merge: true },
    );
    console.log(`Saved to document path "familyTrees/${this.treeId}"`);
  }

  async saveChild() {
    if (this.childForm.invalid) return;

    if (this.isRootNode) {
      const rootNode: TreeNode = {
        label: this.childForm.value.name,
        type: 'person',
        expanded: true,
        data: {
          gender: this.childForm.value.gender || '',
          address: this.childForm.value.address || '',
          phoneNumber: this.childForm.value.phoneNumber || '',
        },
        children: [],
      };

      this.data = [rootNode];
      this.isRootNode = false;
      this.showDialog = false;
      this.childForm.reset();
      await this.saveTree();
      return;
    }

    if (!this.selectedNode) return;

    const child: TreeNode = {
      label: `${this.childForm.value.name}`,
      type: 'person',
      expanded: true,
      data: {
        gender: this.childForm.value.gender || '',
        address: this.childForm.value.address || '',
        phoneNumber: this.childForm.value.phoneNumber || '',
        fatherName: this.selectedNode.label,
        fullName: `${this.childForm.value.name} ${this.selectedNode.label}`,
      },
      children: [],
    };

    if (!this.selectedNode.children) {
      this.selectedNode.children = [];
    }

    this.selectedNode.children.push(child);
    this.selectedNode.expanded = true;
    this.data = [...this.data];

    this.showDialog = false;
    this.childForm.reset();
    await this.saveTree();
  }

  toggleNode(node: any) {
    node.expanded = !node.expanded;
    this.data = [...this.data];
  }

  expandAll(nodes: any[]) {
    nodes.forEach((node) => {
      node.expanded = true;
      if (node.children) this.expandAll(node.children);
    });
  }

  collapseAll(nodes: any[]) {
    nodes.forEach((node) => {
      node.expanded = false;
      if (node.children) this.collapseAll(node.children);
    });
  }

  getTooltipText(data: any): string {
    if (!data) return '';
    let text = `<strong>${data.fullName || 'No Name'}</strong>`;
    if (data.phoneNumber) text += `<br/>📞 ${data.phoneNumber}`;
    if (data.address) text += `<br/>📍 ${data.address}`;
    return text;
  }

  get totalMembersCount(): number {
    if (!this.data) return 0;
    let count = 0;
    const countNodes = (node: any) => {
      if (!node) return;
      count++;
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          countNodes(child);
        }
      }
    };

    if (!Array.isArray(this.data)) {
      countNodes(this.data);
    } else {
      for (const rootNode of this.data) {
        countNodes(rootNode);
      }
    }
    return count;
  }

  // Scroll Drag Mechanics
  isDragging = false;
  startX = 0;
  startY = 0;
  scrollLeft = 0;
  scrollTop = 0;

  startDrag(event: MouseEvent) {
    const container = event.currentTarget as HTMLElement;
    this.isDragging = true;
    this.startX = event.pageX;
    this.startY = event.pageY;
    this.scrollLeft = container.scrollLeft;
    this.scrollTop = container.scrollTop;
  }

  onDrag(event: MouseEvent) {
    if (!this.isDragging) return;
    const container = event.currentTarget as HTMLElement;
    const dx = event.pageX - this.startX;
    const dy = event.pageY - this.startY;
    container.scrollLeft = this.scrollLeft - dx;
    container.scrollTop = this.scrollTop - dy;
  }

  stopDrag() {
    this.isDragging = false;
  }
}
