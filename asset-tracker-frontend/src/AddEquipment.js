import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Form, Input, Button, Select, message, Row, Col, Card, Typography, DatePicker } from 'antd';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';

const { Option } = Select;
const { Title } = Typography;

const generateAssetId = async (category = '') => {
    let prefix = category ? category.substring(0, 3).toUpperCase() : 'OTH'; 
    try {
        const response = await axios.get(`http://localhost:5000/api/equipment/count/${category}`, {
            headers: getAuthHeader()
        });

        const existingCount = response.data.count || 0; 
        const newIdNumber = (existingCount + 1).toString().padStart(3, '0'); 
        return `${prefix}-${newIdNumber}`; 
    } catch (err) {
        console.error("Error generating assetId", err);
        return `${prefix}-ERR`;
    }
};


// get JWT token from localStorage for all equipment requests
const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { 'x-auth-token': token } : {};
};

const AddEquipment = () => {
    const [form] = Form.useForm();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        status: 'In Stock',
        category: '',
        customCategory: '',
    });

useEffect(() => {
    const fetchAssetId = async () => {
        const categoryToUse = formData.category === 'Other' ? formData.customCategory : formData.category;
        if (!categoryToUse) {
            form.setFieldsValue({ assetId: '' });
            return;
        }

        const newAssetId = await generateAssetId(categoryToUse);
        form.setFieldsValue({ assetId: newAssetId });
    };

    fetchAssetId();
}, [formData.category, formData.customCategory, form]);


    const onFinish = async (values) => {
        const categoryToUse = values.category === 'Other' ? values.customCategory : values.category;
    const assetId = await generateAssetId(categoryToUse);
    
    const finalValues = {
        ...values,
        assetId: assetId, // Add this line
        warrantyInfo: values.warrantyInfo ? values.warrantyInfo.format('YYYY-MM-DD') : null,
        category: values.category === 'Other' ? values.customCategory : values.category,
    };

        console.log("Auth Header:", getAuthHeader());

        try {
            await axios.post('http://localhost:5000/api/equipment', finalValues, { headers: getAuthHeader() });
            message.success('Equipment added successfully!');
            navigate('/');
        } catch (error) {
            console.error("Error adding equipment:", error);
            message.error(error.response?.data?.message || 'Failed to add equipment.');
        }
    };

    const handleFormChange = (changedValues, allValues) => {
        setFormData(allValues);
    };

    const renderDynamicFields = () => {
        if (formData.status === 'In Use') {
            return (
                <Card title="Assignee Details" bordered={false} style={{ marginBottom: 24 }}>
                    <Row gutter={16}>
                        <Col xs={24} sm={12}><Form.Item name="assigneeName" label="Assignee Name" rules={[{ required: true }]}><Input placeholder="John Doe" /></Form.Item></Col>
                        <Col xs={24} sm={12}><Form.Item name="position" label="Position"><Input placeholder="Software Engineer" /></Form.Item></Col>
                        <Col xs={24} sm={12}><Form.Item name="employeeEmail" label="Employee Email" rules={[{ type: 'email' }]}><Input placeholder="john.doe@example.com" /></Form.Item></Col>
                        <Col xs={24} sm={12}><Form.Item name="phoneNumber" label="Phone Number"><Input placeholder="Enter phone number" /></Form.Item></Col>
                        <Col xs={24} sm={12}><Form.Item name="department" label="Department"><Input placeholder="Technology" /></Form.Item></Col>
                    </Row>
                </Card>
            );
        }
        if (formData.status === 'Damaged') {
            return (
                <Card title="Damage Information" bordered={false} style={{ marginBottom: 24 }}>
                    <Form.Item name="damageDescription" label="Damage Description" rules={[{ required: true }]}>
                        <Input.TextArea rows={4} placeholder="Describe the damage in detail..." />
                    </Form.Item>
                </Card>
            );
        }
        return null;
    };

    return (
        <div style={{ background: '#f0f2f5', padding: '24px' }}>
            <Card style={{ maxWidth: 800, margin: 'auto' }}>
                <Title level={3} style={{ textAlign: 'center', marginBottom: '24px' }}>Add New Equipment</Title>
                <Form form={form} layout="vertical" onFinish={onFinish} onValuesChange={handleFormChange} initialValues={formData}>
                    <Card title="Core Information" bordered={false} style={{ marginBottom: 24 }}>
                        <Row gutter={16}>
                            <Col xs={24} sm={12}><Form.Item name="category" label="Category" rules={[{ required: true }]}><Select placeholder="Select a category"><Option value="Laptop">Laptop</Option><Option value="Headset">Headset</Option><Option value="Keyboard">Keyboard</Option><Option value="Mouse">Mouse</Option><Option value="Monitor">Monitor</Option><Option value="Other">Other</Option></Select></Form.Item></Col>
                            {formData.category === 'Other' && (<Col xs={24} sm={12}><Form.Item name="customCategory" label="Custom Category Name" rules={[{ required: true }]}><Input placeholder="e.g., Docking Station" /></Form.Item></Col>)}
                            <Col xs={24} sm={12}><Form.Item name="status" label="Status" rules={[{ required: true }]}><Select><Option value="In Stock">In Stock</Option><Option value="In Use">In Use</Option><Option value="Damaged">Damaged</Option><Option value="E-Waste">E-Waste</Option></Select></Form.Item></Col>
                        </Row>
                    </Card>
                    {renderDynamicFields()}
                    <Card title="Hardware & Warranty Details" bordered={false} style={{ marginBottom: 24 }}>
                        <Row gutter={16}>
                            <Col xs={24} sm={12}><Form.Item name="model" label="Model / Brand"><Input placeholder="e.g., Dell Latitude 5420" /></Form.Item></Col>
                            <Col xs={24} sm={12}><Form.Item name="serialNumber" label="Serial Number"><Input placeholder="Enter serial number" /></Form.Item></Col>
                            <Col xs={24} sm={12}><Form.Item name="location" label="Location"><Input placeholder="e.g., Hyderabad Office" /></Form.Item></Col>
                            <Col xs={24} sm={12}><Form.Item name="warrantyInfo" label="Warranty Expiry Date"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                        </Row>
                    </Card>
                    <Form.Item name="comment" label="Additional Comments"><Input.TextArea rows={3} placeholder="Any other relevant details..." /></Form.Item>
                    <Form.Item style={{ textAlign: 'center' }}><Button type="primary" htmlType="submit" size="large" style={{ width: '50%' }}>Add Equipment</Button></Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default AddEquipment;