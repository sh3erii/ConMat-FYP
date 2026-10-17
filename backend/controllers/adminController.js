const { Op, fn, col } = require('sequelize');
const { User, Product, ProductReport, Order, OrderItem, Payment, SellerPayout, Bid, BidOffer, OrderStatusEvent } = require('../models');
const { publicFile, number, dateText } = require('../services/formatters');
const { notifySafely } = require('../services/notificationService');
const { aggregateFulfillmentStatus, restoreReservedStock, syncOrderStatusFromItems } = require('../services/orderService');
const { deliveryDeadlineFrom } = require('../services/autoReleaseService');

const sellerRoles = ['Supplier','Wholesaler','Retailer'];
const productUi = { Active:'Visible', Pending:'Hidden', Draft:'Draft', Hidden:'Hidden', Rejected:'Rejected', OutOfStock:'Visible' };
const productDb = { Visible:'Active', Approved:'Active', Hidden:'Hidden', Rejected:'Rejected' };

async function counts() {
  const [pending, verified, totalUsers, activeBids, totalOrders, revenue] = await Promise.all([
    User.count({ where: { role: { [Op.in]: sellerRoles }, verificationStatus: 'Pending' } }),
    User.count({ where: { role: { [Op.in]: sellerRoles }, verificationStatus: 'Approved' } }),
    User.count(), Bid.count({ where: { requestStatus: 'Open' } }), Order.count(), Payment.sum('amount', { where: { status: 'Paid' } })
  ]);
  return { pendingSellers: pending, verifiedSellers: verified, totalUsers, activeBids, totalOrders, revenue: number(revenue) };
}

exports.dashboard = async (req,res,next)=>{ try { const s=await counts(); const reports=[
  {id:'sales',label:'Sales Volume',value:`PKR ${Math.round(s.revenue).toLocaleString()}`,detail:'Paid order value'},
  {id:'orders',label:'Orders',value:String(s.totalOrders),detail:'All marketplace orders'},
  {id:'bids',label:'Bulk Bids',value:String(await BidOffer.count()),detail:'Seller offers submitted'},
  {id:'alerts',label:'Risk Alerts',value:String(s.pendingSellers + await Product.count({where:{status:{[Op.in]:['Pending','Rejected','Hidden']}}})),detail:'Items requiring admin review'}
]; res.json({success:true,kpis:[
  {id:'pending-sellers',label:'Pending Sellers',value:s.pendingSellers,helper:'Awaiting verification',trend:'Review today'},
  {id:'verified-sellers',label:'Verified Sellers',value:s.verifiedSellers,helper:'Approved seller network',trend:'Trusted sellers'},
  {id:'active-users',label:'Active Users',value:await User.count({where:{status:'Active'}}),helper:'All active platform accounts',trend:'RBAC enabled'},
  {id:'monthly-volume',label:'Sales Volume',value:`PKR ${Math.round(s.revenue).toLocaleString()}`,helper:'Paid orders',trend:'Live database'}
],reports,summary:s}); }catch(e){next(e);} };

function verificationDocuments(req, user) {
  return [
    { key: 'idCardPhoto', label: 'ID Card Front', url: publicFile(req, user.idCardPhoto) },
    { key: 'userPhoto', label: 'Live Selfie', url: publicFile(req, user.userPhoto) },
    { key: 'ntnPhoto', label: 'NTN Document', url: publicFile(req, user.ntnPhoto) },
    { key: 'businessApprovalLetter', label: 'Business Approval Document', url: publicFile(req, user.businessApprovalLetter) },
  ].filter((document) => document.url);
}
exports.applications = async (req,res,next)=>{ try { const status=req.query.status||'Pending'; const where={role:{[Op.in]:sellerRoles}}; if(status!=='All') where.verificationStatus=status==='Active'?'Approved':status; if(req.query.search) where[Op.or]=['name','email','companyName','city'].map(k=>({[k]:{[Op.iLike]:`%${req.query.search}%`}})); const users=await User.findAll({where,order:[['createdAt','DESC']]}); const applications=users.map(u=>({ id:u.id,businessName:u.companyName||u.name,ownerName:u.name,role:u.role,city:u.city||'Not provided',phone:u.phone||'Not provided',email:u.email,materialFocus:u.materialFocus||'Construction materials',submittedAt:u.createdAt?.toISOString().slice(0,10),documents:verificationDocuments(req,u),riskLevel:u.idCardPhoto?'Low':'Medium',status:u.verificationStatus==='Approved'?'Approved':u.verificationStatus })); res.json({success:true,applications}); }catch(e){next(e);} };

exports.approve = async (req,res,next)=>{ try { const u=await User.findByPk(req.params.userId); if(!u||!sellerRoles.includes(u.role))return res.status(404).json({success:false,message:'Seller application not found.'}); await u.update({verificationStatus:'Approved',status:'Active',verificationNote:req.body.note||'Approved by admin'}); await notifySafely({userId:u.id,email:u.email,title:'Seller verification approved',message:`Your ${u.role} verification has been approved. Next, add an active payment method in Settings before your products can appear in the marketplace.`,type:'Verification',actionUrl:'/account/settings',emailDetails:{'Next step':'Add JazzCash, Easypaisa, NayaPay, UBL, or Meezan Bank as an active payment method in Settings.','Marketplace visibility':'Your products appear after seller approval and payment method setup are both complete.'}},'Seller approval notification skipped'); res.json({success:true,message:'Seller approved successfully.',seller:{id:u.id,verificationStatus:u.verificationStatus,status:u.status}}); }catch(e){next(e);} };
exports.reject = async (req,res,next)=>{ try { const u=await User.findByPk(req.params.userId); if(!u||!sellerRoles.includes(u.role))return res.status(404).json({success:false,message:'Seller application not found.'}); await u.update({verificationStatus:'Rejected',status:'Rejected',verificationNote:req.body.reason||'Verification rejected'}); await notifySafely({userId:u.id,email:u.email,title:'Business verification update',message:req.body.reason||'Your business verification was rejected. Contact support to resubmit documents.',type:'Verification',actionUrl:'/account/profile'},'Seller rejection notification skipped'); res.json({success:true,message:'Business verification rejected.',seller:{id:u.id,verificationStatus:u.verificationStatus,status:u.status}}); }catch(e){next(e);} };

exports.users = async (req,res,next)=>{ try { const where={}; if(req.query.role&&req.query.role!=='All')where.role=req.query.role; if(req.query.status&&req.query.status!=='All')where.status=req.query.status; if(req.query.search)where[Op.or]=['name','email','city'].map(k=>({[k]:{[Op.iLike]:`%${req.query.search}%`}})); const users=await User.findAll({where,order:[['createdAt','DESC']]}); const result=await Promise.all(users.map(async u=>({id:u.id,name:u.name,email:u.email,role:u.role,city:u.city||'-',status:u.status,verificationStatus:u.verificationStatus,verificationDocuments:verificationDocuments(req,u),orders:await Order.count({where:{buyerId:u.id}}),joined:dateText(u.createdAt)}))); res.json({success:true,users:result}); }catch(e){next(e);} };
exports.userStatus = async (req,res,next)=>{ try { const user=await User.findByPk(req.params.userId);if(!user)return res.status(404).json({success:false,message:'User not found.'});const status=req.body.status;if(!['Active','Pending','Rejected'].includes(status))return res.status(400).json({success:false,message:'Invalid status.'});if(user.id===req.user.id&&status!=='Active')return res.status(400).json({success:false,message:'You cannot suspend or reject your own admin account.'});const reason=String(req.body.reason||'').trim();if(['Pending','Rejected'].includes(status)&&!reason)return res.status(400).json({success:false,message:`A reason is required when marking an account as ${status}.`});if(reason.length>1000)return res.status(400).json({success:false,message:'The status note cannot exceed 1000 characters.'});const isBusiness=sellerRoles.includes(user.role);const verificationStatus=isBusiness?(status==='Active'?'Approved':status):user.verificationStatus;const note=reason||(status==='Active'?'Account restored by admin.':user.verificationNote);await user.update({status,verificationStatus,verificationNote:note});await notifySafely({userId:user.id,email:user.email,title:`Account status changed to ${status}`,message:`An admin changed your account status to ${status}.${note?` Note: ${note}`:''}`,type:'Account',actionUrl:'/account/profile',metadata:{status,verificationStatus,note}},'Account status notification skipped');res.json({success:true,message:`User marked as ${status}.`,user:{id:user.id,status:user.status,verificationStatus:user.verificationStatus,verificationNote:user.verificationNote}}); }catch(e){next(e);} };
exports.reports = async (req,res,next)=>{ try { const s=await counts(); const reports=[{id:'sales',label:'Sales Volume',value:`PKR ${Math.round(s.revenue).toLocaleString()}`,detail:'Total paid transaction value'},{id:'orders',label:'Orders',value:String(s.totalOrders),detail:'Orders across all buyer roles'},{id:'bids',label:'Bulk Bids',value:String(await BidOffer.count()),detail:'Supplier and wholesaler offers'},{id:'alerts',label:'Pending Verification',value:String(s.pendingSellers),detail:'Business accounts awaiting review'}]; res.json({success:true,reports,summary:s}); }catch(e){next(e);} };

exports.bids = async (req, res, next) => {
  try {
    const requests = await Bid.findAll({ order: [['createdAt', 'DESC']] });
    const requestIds = requests.map((request) => request.id);
    const offers = requestIds.length
      ? await BidOffer.findAll({ where: { bidRequestId: { [Op.in]: requestIds } }, order: [['createdAt', 'ASC']] })
      : [];
    const userIds = [...new Set([
      ...requests.map((request) => request.requestedById),
      ...offers.map((offer) => offer.supplierId),
    ].filter(Boolean))];
    const users = userIds.length
      ? await User.findAll({ where: { id: { [Op.in]: userIds } }, attributes: ['id', 'name', 'companyName', 'role', 'city'] })
      : [];
    const usersById = Object.fromEntries(users.map((user) => [user.id, user.toJSON()]));
    const offersByRequest = offers.reduce((groups, offer) => {
      if (!groups[offer.bidRequestId]) groups[offer.bidRequestId] = [];
      groups[offer.bidRequestId].push(offer);
      return groups;
    }, {});

    const bids = requests.map((request) => {
      const plain = request.toJSON();
      const requester = usersById[request.requestedById];
      const requestStatus = plain.requestStatus === 'Open' && plain.expiresAt && new Date(plain.expiresAt) <= new Date()
        ? 'Expired'
        : plain.requestStatus;
      const participants = (offersByRequest[request.id] || []).map((offer) => {
        const supplier = usersById[offer.supplierId];
        return {
          offerId: offer.id,
          supplierId: offer.supplierId,
          name: supplier?.companyName || supplier?.name || 'Deleted user',
          role: supplier?.role || 'Seller',
          city: supplier?.city || 'Not provided',
          bidAmount: number(offer.bidAmount),
          deliveryDays: Number(offer.deliveryDays || 0),
          status: offer.status,
          createdAt: offer.createdAt,
        };
      });

      return {
        id: request.id,
        requestReference: request.id.slice(0, 8).toUpperCase(),
        title: request.title,
        category: request.category,
        city: request.city,
        requiredQuantity: request.requiredQuantity,
        unit: request.unit,
        targetPrice: number(request.targetPrice),
        requestStatus,
        acceptedOfferId: request.acceptedOfferId,
        expiresAt: request.expiresAt,
        createdAt: request.createdAt,
        requester: {
          id: request.requestedById,
          name: requester?.companyName || requester?.name || 'Deleted user',
          role: requester?.role || request.requesterRole,
          city: requester?.city || 'Not provided',
        },
        participants,
      };
    });

    res.json({ success: true, bids });
  } catch (e) { next(e); }
};

async function sellerMap(ids){ const users=ids.length?await User.findAll({where:{id:{[Op.in]:ids}},attributes:['id','name','companyName','role','city']}):[]; return Object.fromEntries(users.map(u=>[u.id,u.toJSON()])); }
exports.products = async (req,res,next)=>{ try { const where={}; if(req.query.category&&req.query.category!=='All')where.category=req.query.category; if(req.query.city&&req.query.city!=='All')where.city=req.query.city; if(req.query.status&&req.query.status!=='All'){ const mapped=productDb[req.query.status]; if(mapped)where.status=mapped; } if(req.query.search)where[Op.or]=['name','description','brand'].map(k=>({[k]:{[Op.iLike]:`%${req.query.search}%`}})); const rows=await Product.findAll({where,order:[['createdAt','DESC']]}); const map=await sellerMap([...new Set(rows.map(p=>p.sellerId))]); const productIds=rows.map(p=>p.id); const reports=productIds.length?await ProductReport.findAll({where:{productId:{[Op.in]:productIds}},order:[['createdAt','DESC']]}):[]; const reporterIds=[...new Set(reports.map(r=>r.reporterId))]; const reporters=reporterIds.length?await User.findAll({where:{id:{[Op.in]:reporterIds}},attributes:['id','name','role']}):[]; const reporterMap=Object.fromEntries(reporters.map(u=>[u.id,u.toJSON()])); const products=rows.map(p=>{const s=map[p.sellerId]||{};const productReports=reports.filter(r=>r.productId===p.id).map(r=>({id:r.id,reason:r.reason,details:r.details||'',status:r.status,adminNote:r.adminNote||'',createdAt:r.createdAt,reporterName:reporterMap[r.reporterId]?.name||'ConMat user',reporterRole:reporterMap[r.reporterId]?.role||'User'}));const pendingReports=productReports.filter(r=>r.status==='Pending');return{id:p.id,name:p.name,category:p.category,city:p.city,image:publicFile(req,p.imageUrl),imageUrl:publicFile(req,p.imageUrl),verificationNote:p.verificationNote||'',reviewRequestNote:p.reviewRequestNote||'',reviewRequestedAt:p.reviewRequestedAt||null,sellerName:s.companyName||s.name||'Unknown seller',sellerRole:s.role||'Seller',retailPrice:number(p.retailPrice),wholesalePrice:number(p.wholesalePrice),price:s.role==='Supplier'?number(p.wholesalePrice):number(p.retailPrice),minWholesaleQty:Number(p.minWholesaleQty||1),minimumOrderQty:s.role==='Supplier'?Number(p.minWholesaleQty||1):1,stock:p.stock,status:productUi[p.status]||'Hidden',reportCount:pendingReports.length,totalReportCount:productReports.length,pendingReportCount:pendingReports.length,reports:productReports,latestReport:pendingReports[0]||productReports[0]||null,updatedAt:p.updatedAt};}); res.json({success:true,products,data:products}); }catch(e){next(e);} };
exports.productStatus = async (req, res, next) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    const requestedStatus = req.body.status;
    let status = productDb[requestedStatus];
    if (!status) return res.status(400).json({ success: false, message: 'Invalid admin product status.' });

    const reportDecision = req.body.reportDecision === true;
    const requestInfo = req.body.requestInfo === true;
    if (requestInfo && requestedStatus !== 'Hidden') {
      return res.status(400).json({ success: false, message: 'Seller information can only be requested while a listing remains hidden.' });
    }
    const reportCount = reportDecision || requestedStatus === 'Rejected'
      ? await ProductReport.count({ where: { productId: product.id, status: 'Pending' } })
      : 0;
    if (reportDecision && !['Approved', 'Rejected'].includes(requestedStatus)) {
      return res.status(400).json({ success: false, message: 'A report decision must approve or reject the listing.' });
    }
    if (requestedStatus === 'Rejected' && (!reportDecision || reportCount === 0)) {
      return res.status(409).json({ success: false, message: 'A product can only be rejected while it has a pending user report.' });
    }
    if (reportDecision && reportCount === 0) {
      return res.status(409).json({ success: false, message: 'This product has no pending reports to decide.' });
    }

    const submittedNote = String(req.body.note || req.body.adminNote || '').trim();
    if (['Hidden', 'Rejected'].includes(requestedStatus) && !submittedNote) {
      return res.status(400).json({ success: false, message: `An admin note is required when marking a listing as ${requestedStatus}.` });
    }
    if (submittedNote.length > 1000) return res.status(400).json({ success: false, message: 'The admin note cannot exceed 1000 characters.' });

    if (requestedStatus === 'Approved') status = product.stock === 0 ? 'OutOfStock' : 'Active';
    const note = submittedNote || (requestedStatus === 'Approved' ? 'Approved by admin.' : product.verificationNote);
    const clearsReview = ['Approved', 'Hidden', 'Rejected'].includes(requestedStatus);
    await product.update({ status, verificationNote: note, ...(clearsReview ? { reviewRequestNote: null, reviewRequestedAt: null } : {}) });

    let reviewedReportCount = 0;
    if (reportDecision) {
      [reviewedReportCount] = await ProductReport.update(
        { status: 'Reviewed', adminNote: note, reviewedBy: req.user.id, reviewedAt: new Date() },
        { where: { productId: product.id, status: 'Pending' } }
      );
    }

    const seller = await User.findByPk(product.sellerId, { attributes: ['id', 'email'] });
    if (seller) {
      const title = requestInfo ? 'More information requested for your product listing' : requestedStatus === 'Hidden' ? 'Product listing hidden' : requestedStatus === 'Approved' ? 'Product listing approved' : requestedStatus === 'Rejected' ? 'Product listing rejected' : 'Product review status updated';
      const message = requestInfo ? `An admin requested more information for your hidden listing "${product.name}". Admin note: ${note}` : requestedStatus === 'Hidden' ? `Your listing "${product.name}" was hidden by an admin. Admin note: ${note} Update the listing and request another review.` : requestedStatus === 'Approved' ? `Your listing "${product.name}" was approved and is visible in the marketplace again. Admin note: ${note}` : `Your listing "${product.name}" was marked as ${requestedStatus}. Admin note: ${note}`;
      await notifySafely({ userId: seller.id, email: seller.email, title, message, type: 'Verification', actionUrl: '/manage-products', metadata: { productId: product.id, status: requestedStatus, requestInfo, note } }, 'Product status notification skipped');
    }

    res.json({ success: true, message: requestInfo ? 'Information requested from the seller.' : `Product marked as ${requestedStatus}. The seller was notified.`, reviewedReportCount, product: { ...product.toJSON(), status: productUi[product.status], ...(reportDecision ? { reportCount: 0, pendingReportCount: 0 } : {}) } });
  } catch (e) { next(e); }
};
exports.reviewProductReports = async (req,res,next)=>{ try { const product=await Product.findByPk(req.params.id);if(!product)return res.status(404).json({success:false,message:'Product not found.'});const pending=await ProductReport.count({where:{productId:product.id,status:'Pending'}});if(!pending)return res.status(400).json({success:false,message:'This product has no pending reports.'});const adminNote=String(req.body.adminNote||req.body.note||'Report reviewed by admin.').trim();await ProductReport.update({status:'Reviewed',adminNote,reviewedBy:req.user.id,reviewedAt:new Date()},{where:{productId:product.id,status:'Pending'}});res.json({success:true,message:`${pending} report${pending===1?'':'s'} reviewed.`,reviewedCount:pending});}catch(e){next(e);} };
exports.deleteReportedProduct = async (req,res,next)=>{ try { const product=await Product.findByPk(req.params.id);if(!product)return res.status(404).json({success:false,message:'Product not found.'});const reports=await ProductReport.findAll({where:{productId:product.id}});if(!reports.length)return res.status(400).json({success:false,message:'This listing has no reports to review.'});if(reports.some(report=>report.status==='Pending'))return res.status(409).json({success:false,message:'Review all pending reports before deleting the listing.'});const reason=String(req.body.reason||req.body.adminNote||'The listing violated marketplace policies.').trim();const seller=await User.findByPk(product.sellerId,{attributes:['id','email']});const productName=product.name;await product.destroy();await ProductReport.update({status:'Resolved',adminNote:reason,reviewedBy:req.user.id,reviewedAt:new Date()},{where:{productId:req.params.id}});if(seller)await notifySafely({userId:seller.id,email:seller.email,title:'Product listing removed',message:`Your listing "${productName}" was removed by an admin after report review. Reason: ${reason}`,type:'Report',actionUrl:'/manage-products',metadata:{productId:req.params.id,action:'deleted',reason}},'Product deletion notification skipped');res.json({success:true,message:'Reported product deleted and the uploader was notified.'});}catch(e){next(e);} };

async function normalizeOrders(rows) {
  const orderIds = rows.map((order) => order.id);
  const [allItems, payouts] = await Promise.all([
    rows.length ? OrderItem.findAll({ where: { orderId: { [Op.in]: orderIds } } }) : [],
    rows.length ? SellerPayout.findAll({ where: { orderId: { [Op.in]: orderIds } } }) : [],
  ]);
  const buyerIds = [...new Set(rows.map((order) => order.buyerId))];
  const sellers = await sellerMap([...new Set(allItems.map((item) => item.sellerId))]);
  const buyers = buyerIds.length ? await User.findAll({ where: { id: { [Op.in]: buyerIds } }, attributes: ['id','name','role','city'] }) : [];
  const buyerMap = Object.fromEntries(buyers.map((buyer) => [buyer.id, buyer.toJSON()]));
  return rows.map((order) => {
    const items = allItems.filter((item) => item.orderId === order.id);
    const orderPayouts = payouts.filter((payout) => payout.orderId === order.id);
    const sellerNames = [...new Set(items.map((item) => sellers[item.sellerId]?.companyName || sellers[item.sellerId]?.name).filter(Boolean))];
    const payoutStatus = !orderPayouts.length
      ? (order.paymentStatus === 'Paid' ? 'Held' : 'NotFunded')
      : orderPayouts.every((payout) => payout.status === 'Transferred')
        ? 'Released'
        : orderPayouts.some((payout) => payout.status === 'Transferred')
          ? 'PartiallyReleased'
          : orderPayouts.some((payout) => payout.status === 'Failed') ? 'ReleaseFailed' : 'Held';
    const fulfillmentStatus = aggregateFulfillmentStatus(items);
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      itemsCount: items.reduce((sum, item) => sum + item.quantity, 0),
      placedAt: dateText(order.createdAt),
      buyerName: buyerMap[order.buyerId]?.name || order.buyerName || 'Buyer',
      buyerRole: buyerMap[order.buyerId]?.role || order.buyerRole,
      city: order.city || buyerMap[order.buyerId]?.city || '-',
      sellerName: sellerNames.length > 1 ? 'Multiple sellers' : sellerNames[0] || 'Seller',
      deliveryWindow: order.deliveryWindow || '2–3 days',
      totalAmount: number(order.totalAmount),
      paymentStatus: order.paymentStatus,
      payoutStatus,
      commissionAmount: orderPayouts.reduce((sum, payout) => sum + number(payout.commissionAmount), 0),
      sellerPayoutAmount: orderPayouts.reduce((sum, payout) => sum + number(payout.netAmount), 0),
      orderStatus: fulfillmentStatus,
      storedOrderStatus: order.orderStatus,
      fulfillmentStatus,
      items: items.map((item) => ({
        id: item.id,
        productName: item.productName,
        sellerId: item.sellerId,
        sellerName: sellers[item.sellerId]?.companyName || sellers[item.sellerId]?.name || 'Seller',
        quantity: item.quantity,
        unit: item.unit,
        fulfillmentStatus: item.fulfillmentStatus || order.orderStatus,
        deliveryCity: item.deliveryCity || order.city,
        deliveryWindow: item.deliveryWindow || order.deliveryWindow,
        deliveryResolution: item.deliveryResolution,
      })),
    };
  });
}
exports.orders = async (req,res,next)=>{ try { const where={};if(req.query.orderStatus&&req.query.orderStatus!=='All')where.orderStatus=req.query.orderStatus;if(req.query.paymentStatus&&req.query.paymentStatus!=='All')where.paymentStatus=req.query.paymentStatus;if(req.query.city&&req.query.city!=='All')where.city=req.query.city;if(req.query.search)where.orderNumber={[Op.iLike]:`%${req.query.search}%`};const rows=await Order.findAll({where,order:[['createdAt','DESC']]});const orders=await normalizeOrders(rows);res.json({success:true,orders,data:orders}); }catch(e){next(e);} };
exports.actionSummary = async (req,res,next)=>{ try { res.json({success:true,summary:{pendingProducts:await Product.count({where:{status:{[Op.in]:['Pending','Draft']}}}),pendingReports:await ProductReport.count({where:{status:'Pending'}}),activeOrders:await Order.count({where:{orderStatus:{[Op.notIn]:['Delivered','Cancelled']}}}),hiddenProducts:await Product.count({where:{status:'Hidden'}}),paymentIssues:await Order.count({where:{[Op.or]:[{paymentStatus:'Failed'},{orderStatus:'Payment Issue'}]}})}}); }catch(e){next(e);} };

exports.overview = async (req,res,next)=>{ try { const s=await counts();const paid=await Payment.count({where:{status:'Paid'}}),activeUsers=await User.count({where:{status:'Active'}});res.json({success:true,data:{totalRevenue:s.revenue,totalOrders:s.totalOrders,activeUsers,verifiedSellers:s.verifiedSellers,pendingVerifications:s.pendingSellers,conversionRate:s.totalOrders?Number((paid/s.totalOrders*100).toFixed(1)):0,averageOrderValue:s.totalOrders?Math.round(s.revenue/s.totalOrders):0,platformHealth:s.totalUsers?Number((activeUsers/s.totalUsers*100).toFixed(1)):0}}); }catch(e){next(e);} };
exports.revenueTrend = async (req,res,next)=>{ try { const months=[];for(let i=5;i>=0;i--){const start=new Date();start.setMonth(start.getMonth()-i,1);start.setHours(0,0,0,0);const end=new Date(start);end.setMonth(end.getMonth()+1);const payments=await Payment.findAll({where:{status:'Paid',paidAt:{[Op.gte]:start,[Op.lt]:end}}});months.push({label:start.toLocaleString('en-US',{month:'short'}),revenue:payments.reduce((s,p)=>s+number(p.amount),0),orders:payments.length});}res.json({success:true,data:months}); }catch(e){next(e);} };
exports.orderBreakdown = async (req,res,next)=>{ try { const statuses=['Placed','Confirmed','Processing','Dispatched','Delivered','Cancelled'];const data=[];for(const st of statuses)data.push({label:st==='Placed'?'Pending':st,value:await Order.count({where:{orderStatus:st}}),tone:st==='Cancelled'?'danger':st==='Delivered'?'success':'info'});res.json({success:true,data}); }catch(e){next(e);} };
exports.roleBreakdown = async (req,res,next)=>{ try { const data=[];for(const role of ['Customer','Retailer','Wholesaler','Supplier','Admin'])data.push({label:`${role}s`,value:await User.count({where:{role}})});res.json({success:true,data}); }catch(e){next(e);} };
exports.lowStock = async (req,res,next)=>{ try { const threshold=Math.max(1,Math.floor(number(req.query.threshold||50)));const rows=await Product.findAll({where:{stock:{[Op.lte]:threshold},status:{[Op.notIn]:['Hidden','Rejected'] }},order:[['stock','ASC']],limit:20});const map=await sellerMap([...new Set(rows.map(p=>p.sellerId))]);const data=rows.map(p=>({id:p.id,productName:p.name,sku:p.id.slice(0,8).toUpperCase(),currentStock:p.stock,threshold,severity:p.stock<=threshold/2?'High':'Medium',sellerName:map[p.sellerId]?.companyName||map[p.sellerId]?.name||'Seller'}));res.json({success:true,data}); }catch(e){next(e);} };
exports.performance = async (req,res,next)=>{ try { const totalPayments=await Payment.count(),paid=await Payment.count({where:{status:'Paid'}}),offers=await BidOffer.count(),accepted=await BidOffer.count({where:{status:'Accepted'}}),totalOrders=await Order.count(),delivered=await Order.count({where:{orderStatus:'Delivered'}}),totalUsers=await User.count(),activeUsers=await User.count({where:{status:'Active'}});res.json({success:true,data:[{label:'Active User Rate',value:totalUsers?Number((activeUsers/totalUsers*100).toFixed(1)):0,suffix:'%',description:'Active accounts in the database'},{label:'Order Completion',value:totalOrders?Number((delivered/totalOrders*100).toFixed(1)):0,suffix:'%',description:'Orders marked delivered'},{label:'Payment Success',value:totalPayments?Number((paid/totalPayments*100).toFixed(1)):0,suffix:'%',description:'Confirmed payments'},{label:'Bid Acceptance',value:offers?Number((accepted/offers*100).toFixed(1)):0,suffix:'%',description:'Accepted offers'}]}); }catch(e){next(e);} };
exports.reportPanels = async (req,res,next)=>{ try { res.json({success:true,data:[{title:'Seller Verification Report',description:'Pending, approved and rejected seller accounts for admin review.',metric:`${await User.count({where:{verificationStatus:'Pending'}})} pending`},{title:'Product Moderation Report',description:'Products hidden, rejected or waiting for review.',metric:`${await Product.count({where:{status:{[Op.in]:['Pending','Hidden','Rejected']}}})} actions`},{title:'Bidding Performance Report',description:'Bulk requests and accepted seller offers.',metric:`${await BidOffer.count({where:{status:'Accepted'}})} accepted`}]}); }catch(e){next(e);} };

// An admin order-level action is an explicit bulk action. Keep every item and
// its timeline in sync rather than changing only the compatibility order field.
exports.orderStatus = async (req, res, next) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    const status = req.body.orderStatus || req.body.status;
    const allowed = ['Confirmed', 'Processing', 'Packed', 'Dispatched', 'Delivered', 'Payment Issue', 'Cancelled'];
    if (!allowed.includes(status)) return res.status(400).json({ success: false, message: 'Invalid order status.' });
    if (!['Cancelled', 'Payment Issue'].includes(status) && order.paymentStatus !== 'Paid') {
      return res.status(409).json({ success: false, message: 'The buyer payment must be confirmed before fulfillment can begin.' });
    }
    const items = await OrderItem.findAll({ where: { orderId: order.id } });
    if (status === 'Cancelled' && order.orderStatus !== 'Cancelled') await restoreReservedStock(order);
    const note = String(req.body.note || `Admin changed all products to ${status}.`).trim();
    const changedAt = new Date();
    for (const item of items) {
      await item.update({
        fulfillmentStatus: status,
        deliveredAt: status === 'Delivered' ? (item.deliveredAt || changedAt) : null,
        deliveryResponseDeadline: status === 'Delivered'
          ? (item.deliveryResponseDeadline || deliveryDeadlineFrom(item.deliveredAt || changedAt))
          : null,
        deliveryResolution: status === 'Delivered' ? (item.deliveryResolution || 'AwaitingBuyer') : null,
      });
    }
    await OrderStatusEvent.bulkCreate(items.map((item) => ({
      orderId: order.id,
      orderItemId: item.id,
      sellerId: item.sellerId,
      status,
      description: note,
      updatedBy: req.user.id,
    })));
    await syncOrderStatusFromItems(order);
    const buyer = await User.findByPk(order.buyerId);
    await notifySafely({
      userId: order.buyerId,
      email: buyer?.email,
      title: 'Order products updated by admin',
      message: `All products in ${order.orderNumber} are now ${status}.`,
      type: 'Order',
      actionUrl: `/orders/${order.id}/tracking`,
    }, 'Admin order status notification skipped');
    return res.json({ success: true, order: (await normalizeOrders([order]))[0] });
  } catch (e) { return next(e); }
};
