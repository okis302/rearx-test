// report-management-system/tests/unit/ReportList.spec.js
import { shallowMount } from '@vue/test-utils';
import ReportList from '@/components/ReportList.vue';

// Mock the router
const mockRouter = {
  push: jest.fn()
};

// Sample reports data
const mockReports = [
  { id: 1, title: 'Report Alpha', content: 'Content Alpha' },
  { id: 2, title: 'Report Beta', content: 'Content Beta' }
];

describe('ReportList.vue', () => {
  let wrapper;

  // Helper function to mount the component with specific props and mocks
  const mountComponent = (propsData = { reports: [] }) => {
    return shallowMount(ReportList, {
      props: propsData,
      global: {
        mocks: {
          $router: mockRouter
        }
      }
    });
  };

  beforeEach(() => {
    // Clear mock router history before each test
    mockRouter.push.mockClear();
    // Reset window.confirm mock if it was set by a previous test
    if (typeof window.confirm.mockReset === 'function') {
      window.confirm.mockReset();
    }
  });

  it('renders a message when no reports are provided', () => {
    wrapper = mountComponent(); // Default empty reports
    expect(wrapper.find('ul').findAll('li').length).toBe(0);
    expect(wrapper.find('p').text()).toContain('No reports available. Create one!');
  });

  it('renders a list of reports correctly', () => {
    wrapper = mountComponent({ reports: mockReports });
    const listItems = wrapper.findAll('li');
    expect(listItems.length).toBe(mockReports.length);
    expect(listItems[0].find('span').text()).toBe(mockReports[0].title);
    expect(listItems[1].find('span').text()).toBe(mockReports[1].title);
  });

  it('navigates to create report page when "Create New Report" is clicked', async () => {
    wrapper = mountComponent({ reports: mockReports });
    await wrapper.find('button.create-btn').trigger('click');
    expect(mockRouter.push).toHaveBeenCalledWith({ name: 'ReportCreate' });
  });

  it('navigates to view report page when "View" button is clicked', async () => {
    wrapper = mountComponent({ reports: mockReports });
    // In ReportList.vue, buttons are inside a div, so nth-child refers to that div's children.
    // <button @click="navigateToView(report.id)">View</button> is the first button in the div
    await wrapper.findAll('li').at(0).find('div').findAll('button').at(0).trigger('click');
    expect(mockRouter.push).toHaveBeenCalledWith({ name: 'ReportView', params: { id: mockReports[0].id } });
  });

  it('navigates to edit report page when "Edit" button is clicked', async () => {
    wrapper = mountComponent({ reports: mockReports });
    // <button @click="navigateToEdit(report.id)">Edit</button> is the second button in the div
    await wrapper.findAll('li').at(0).find('div').findAll('button').at(1).trigger('click');
    expect(mockRouter.push).toHaveBeenCalledWith({ name: 'ReportEdit', params: { id: mockReports[0].id } });
  });

  it('emits "delete-report" event with report ID when "Delete" button is clicked after confirmation', async () => {
    window.confirm = jest.fn(() => true);
    wrapper = mountComponent({ reports: mockReports });

    // <button @click="confirmDelete(report.id)">Delete</button> is the third button in the div
    await wrapper.findAll('li').at(0).find('div').findAll('button').at(2).trigger('click');

    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this report?');
    expect(wrapper.emitted('delete-report')).toBeTruthy();
    expect(wrapper.emitted('delete-report')[0]).toEqual([mockReports[0].id]);
  });

  it('does not emit "delete-report" event if confirmation is cancelled', async () => {
    window.confirm = jest.fn(() => false);
    wrapper = mountComponent({ reports: mockReports });

    await wrapper.findAll('li').at(0).find('div').findAll('button').at(2).trigger('click');

    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this report?');
    expect(wrapper.emitted('delete-report')).toBeFalsy();
  });
});
