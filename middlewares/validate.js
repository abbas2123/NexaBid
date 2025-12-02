const { ZodError, success}=require('zod');


module.exports =(schema) =>(req,res,next)=>{
    try {
        req.validatedData = schema.parse(req.body);
        next();
    } catch (err) {
        if(err instanceof ZodError){
            return res.status(400).json({
                success:false,
                message:err.errors[0].message,
            });
        }
        return res.status(400).json({success:false,message:'Invalid data'});
    }
};