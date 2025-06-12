// report-management-system/tests/unit/ReportView.spec.js
import { shallowMount } from '@vue/test-utils';
import ReportView from '@/components/ReportView.vue';

// Mock the router
const mockRouter = {
  push: jest.fn(),
  // replace: jest.fn() // If you use replace for not found redirection
};

// Sample report data
const mockReport = { id: 1, title: 'Test Report', content: 'This is the content.' };

// Mock getReportById function (simulates prop passed from App.vue)
const mockGetReportById = jest.fn();

describe('ReportView.vue', () => {
  let wrapper;

  // Helper function to mount the component
  const mountComponent = (propsData) => {
    return shallowMount(ReportView, {
      props: propsData,
      global: {
        mocks: {
          $router: mockRouter
        }
      }
    });
  };

  beforeEach(() => {
    mockRouter.push.mockClear();
    // mockRouter.replace.mockClear();
    mockGetReportById.mockClear();
     // Reset console spy if it was set
    if (console.warn.mockRestore) {
      console.warn.mockRestore();
    }
  });

  it('renders report details when a report is found', () => {
    mockGetReportById.mockReturnValue(mockReport); // Configure mock to return the report
    wrapper = mountComponent({ id: '1', getReportById: mockGetReportById });

    expect(mockGetReportById).toHaveBeenCalledWith('1');
    expect(wrapper.find('h2').text()).toBe(mockReport.title);
    expect(wrapper.find('p').text()).toBe(mockReport.content);
    expect(wrapper.find('button').text()).toBe('Close');
  });

  it('renders a placeholder or message if report is not found', () => {
    mockGetReportById.mockReturnValue(null); // Configure mock to return null (report not found)
    wrapper = mountComponent({ id: 'nonexistent', getReportById: mockGetReportById });

    expect(mockGetReportById).toHaveBeenCalledWith('nonexistent');
    // Component template has a v-else for the main v-if="report"
    // <div v-else><p>Report not found or loading...</p></div>
    expect(wrapper.find('.report-view').exists()).toBe(false);
    expect(wrapper.find('p').exists()).toBe(true);
    expect(wrapper.find('p').text()).toBe('Report not found or loading...');
  });

  it('handles component re-render with different id (watchers)', async () => {
    const report1 = { id: 1, title: 'Report 1', content: 'Content 1' };
    const report2 = { id: 2, title: 'Report 2', content: 'Content 2' };
    mockGetReportById.mockImplementation(id => {
        // Ensure consistent type comparison for ID
        const numericId = Number(id);
        if (numericId === 1) return report1;
        if (numericId === 2) return report2;
        return null;
    });

    wrapper = mountComponent({ id: '1', getReportById: mockGetReportById });
    expect(wrapper.vm.report.title).toBe('Report 1');

    await wrapper.setProps({ id: '2' }); // Simulate route change updating the id prop
    expect(mockGetReportById).toHaveBeenCalledWith('2'); // getReportById is called by the watcher
    expect(wrapper.vm.report.title).toBe('Report 2');
    expect(wrapper.find('h2').text()).toBe('Report 2'); // UI updates
  });


  it('navigates to home when "Close" button is clicked', async () => {
    mockGetReportById.mockReturnValue(mockReport);
    wrapper = mountComponent({ id: '1', getReportById: mockGetReportById });

    await wrapper.find('button').trigger('click');
    expect(mockRouter.push).toHaveBeenCalledWith('/');
  });

  it('logs a warning if id is provided but getReportById is not passed as a function', () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Mount with getReportById as undefined or not a function
    wrapper = mountComponent({ id: '1', getReportById: undefined });

    // The component's created hook:
    // if (this.id && this.getReportById) { this.report = this.getReportById(this.id); }
    // This condition will be false.
    // Then: if (!this.report && this.id) { console.warn(`Report with id ${this.id} not found.`); }
    // This warning will be triggered because this.report is null and this.id is '1'.
    expect(consoleWarnSpy).toHaveBeenCalledWith('Report with id 1 not found.');

    consoleWarnSpy.mockRestore();
  });

  it('logs a warning if report is not found on created', () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockGetReportById.mockReturnValue(null); // Simulate report not found

    wrapper = mountComponent({ id: 'unknown', getReportById: mockGetReportById });

    expect(mockGetReportById).toHaveBeenCalledWith('unknown');
    expect(consoleWarnSpy).toHaveBeenCalledWith('Report with id unknown not found.');

    consoleWarnSpy.mockRestore();
  });

  it('logs a warning if report is not found on id watch change', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockGetReportById.mockReturnValueOnce(mockReport); // Initial report

    wrapper = mountComponent({ id: '1', getReportById: mockGetReportById });

    mockGetReportById.mockReturnValueOnce(null); // Report not found on change
    await wrapper.setProps({ id: 'unknown' });

    expect(mockGetReportById).toHaveBeenCalledWith('unknown');
    expect(consoleWarnSpy).toHaveBeenCalledWith('Report with id unknown not found after route change.');

    consoleWarnSpy.mockRestore();
  });
});
