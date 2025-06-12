// report-management-system/tests/unit/ReportEdit.spec.js
import { shallowMount } from '@vue/test-utils';
import ReportEdit from '@/components/ReportEdit.vue';

// Mock the router
const mockRouter = {
  push: jest.fn()
};

// Mock getReportById function
const mockGetReportById = jest.fn();
const mockExistingReport = { id: 1, title: 'Existing Report', content: 'Existing Content' };

// Mock Date.now() for consistent new report IDs if needed for assertions
let mockDateNow;

describe('ReportEdit.vue', () => {
  let wrapper;

  // Helper function to mount the component
  const mountComponent = (propsData = {}) => {
    return shallowMount(ReportEdit, {
      props: {
        getReportById: mockGetReportById, // Always provide, even if id is not set initially
        ...propsData // Spread other props like id
      },
      global: {
        mocks: {
          $router: mockRouter
        }
      }
    });
  };

  beforeAll(() => {
    // Mock Date.now() once for all tests in this suite
    mockDateNow = jest.spyOn(Date, 'now').mockImplementation(() => 1234567890);
  });

  beforeEach(() => {
    mockRouter.push.mockClear();
    mockGetReportById.mockClear();
    // Clear console spy if it was set by a previous test in another suite (though not used here directly)
    if (console.warn && console.warn.mockRestore) {
      console.warn.mockRestore();
    }
  });

  afterAll(() => {
    // Restore original Date.now after all tests
    if (mockDateNow) {
      mockDateNow.mockRestore();
    }
  });

  describe('Create Mode', () => {
    beforeEach(() => {
      // No 'id' prop means create mode
      wrapper = mountComponent();
    });

    it('renders correctly in create mode', () => {
      expect(wrapper.find('h2').text()).toBe('Create Report');
      expect(wrapper.find('input#title').element.value).toBe('');
      expect(wrapper.find('textarea#content').element.value).toBe('');
      expect(wrapper.vm.editing).toBe(false);
    });

    it('updates reportData on input in create mode', async () => {
      await wrapper.find('input#title').setValue('New Title');
      expect(wrapper.vm.reportData.title).toBe('New Title');
      await wrapper.find('textarea#content').setValue('New Content');
      expect(wrapper.vm.reportData.content).toBe('New Content');
    });

    it('emits "save-report" with new data and generated ID on save in create mode', async () => {
      await wrapper.setData({ reportData: { title: 'New Report', content: 'Fresh Content' } });
      await wrapper.find('form').trigger('submit.prevent');

      expect(wrapper.emitted('save-report')).toBeTruthy();
      expect(wrapper.emitted('save-report')[0][0]).toEqual({
        id: 1234567890, // From mocked Date.now()
        title: 'New Report',
        content: 'Fresh Content'
      });
    });

    it('navigates to home on cancel in create mode', async () => {
      await wrapper.find('button[type="button"]').trigger('click'); // Cancel button
      expect(mockRouter.push).toHaveBeenCalledWith('/');
    });
  });

  describe('Edit Mode', () => {
    beforeEach(() => {
      mockGetReportById.mockReturnValue(mockExistingReport);
      // Pass id as a number, matching typical data types
      wrapper = mountComponent({ id: mockExistingReport.id });
    });

    it('renders correctly and populates form in edit mode', () => {
      expect(mockGetReportById).toHaveBeenCalledWith(mockExistingReport.id);
      expect(wrapper.find('h2').text()).toBe('Edit Report');
      expect(wrapper.vm.editing).toBe(true);
      expect(wrapper.vm.reportData.title).toBe(mockExistingReport.title);
      expect(wrapper.vm.reportData.content).toBe(mockExistingReport.content);
      expect(wrapper.find('input#title').element.value).toBe(mockExistingReport.title);
      expect(wrapper.find('textarea#content').element.value).toBe(mockExistingReport.content);
    });

    it('handles report not found for editing gracefully', () => {
        mockGetReportById.mockReturnValue(null); // Report not found
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

        // Mount with an ID that won't be found
        wrapper = mountComponent({ id: 'nonexistent-id' });

        expect(mockGetReportById).toHaveBeenCalledWith('nonexistent-id');
        expect(wrapper.vm.editing).toBe(false);
        expect(wrapper.vm.reportData.title).toBe('');
        expect(consoleWarnSpy).toHaveBeenCalledWith('Report with id nonexistent-id not found for editing.');

        consoleWarnSpy.mockRestore();
    });

    it('updates reportData on input in edit mode', async () => {
      await wrapper.find('input#title').setValue('Updated Title');
      expect(wrapper.vm.reportData.title).toBe('Updated Title');
      // Content should remain unchanged from initial load
      expect(wrapper.vm.reportData.content).toBe(mockExistingReport.content);
    });

    it('emits "save-report" with updated data and existing ID on save in edit mode', async () => {
      await wrapper.setData({
        reportData: { ...wrapper.vm.reportData, title: 'Super Updated Title' }
      });
      await wrapper.find('form').trigger('submit.prevent');

      expect(wrapper.emitted('save-report')).toBeTruthy();
      expect(wrapper.emitted('save-report')[0][0]).toEqual({
        id: mockExistingReport.id, // Existing ID
        title: 'Super Updated Title',
        content: mockExistingReport.content
      });
    });

    it('navigates to report view on cancel in edit mode', async () => {
      await wrapper.find('button[type="button"]').trigger('click'); // Cancel button
      expect(mockRouter.push).toHaveBeenCalledWith({ name: 'ReportView', params: { id: mockExistingReport.id } });
    });
  });

  it('reacts to id prop changes (watchers)', async () => {
    const report1 = { id: 1, title: 'R1', content: 'C1' };
    const report2 = { id: 2, title: 'R2', content: 'C2' };

    mockGetReportById.mockImplementation(id => {
        // Ensure consistent type for comparison, route params are strings, data IDs are numbers
        const numericId = Number(id);
        if (numericId === 1) return report1;
        if (numericId === 2) return report2;
        return null;
    });

    wrapper = mountComponent({ id: 1 }); // Initial mount in edit mode
    expect(wrapper.vm.reportData.title).toBe('R1');
    expect(wrapper.vm.editing).toBe(true);

    // Change to create mode (id becomes undefined)
    await wrapper.setProps({ id: undefined });
    expect(wrapper.vm.reportData.title).toBe(''); // Form resets
    expect(wrapper.vm.editing).toBe(false); // Switches to create mode

    // Change back to edit mode with a different id
    await wrapper.setProps({ id: 2 });
    expect(mockGetReportById).toHaveBeenCalledWith(2); // Called by watcher
    expect(wrapper.vm.reportData.title).toBe('R2'); // Loads new report data
    expect(wrapper.vm.editing).toBe(true); // Switches to edit mode
  });
});
